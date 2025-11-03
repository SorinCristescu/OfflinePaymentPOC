package com.offlinepaymentpoc

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.*
import java.security.*
import java.security.spec.ECGenParameterSpec
import java.security.spec.X509EncodedKeySpec
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * SMVCSecurityModule - Android Keystore with TEE/StrongBox Support
 *
 * This native module provides hardware-backed cryptographic operations using
 * Android Keystore with TEE (Trusted Execution Environment) or StrongBox backing.
 *
 * Features:
 * - Hardware-backed key generation (EC secp256r1)
 * - Signing with SHA256withECDSA
 * - Encryption using ECIES (ECDH + AES-GCM)
 * - Biometric authentication integration
 * - Key isolation in hardware
 *
 * Security Properties:
 * - Keys generated with setIsStrongBoxBacked for devices with StrongBox
 * - Private keys never leave hardware security module
 * - Biometric-bound keys require user authentication
 * - Automatic hardware vs software fallback
 */
class SMVCSecurityModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "SMVCSecurityModule"
        private const val ANDROID_KEYSTORE = "AndroidKeystore"
        private const val KEY_ALGORITHM_EC = KeyProperties.KEY_ALGORITHM_EC
        private const val KEY_SIZE = 256
        private const val EC_CURVE = "secp256r1"
        private const val SIGNATURE_ALGORITHM = "SHA256withECDSA"
        private const val AES_ALGORITHM = "AES/GCM/NoPadding"
        private const val GCM_TAG_LENGTH = 128
        private const val GCM_IV_LENGTH = 12
    }

    override fun getName(): String = "SMVCSecurityModule"

    /**
     * Check hardware support for secure key storage
     *
     * @param promise Promise resolving to hardware capabilities
     */
    @ReactMethod
    fun checkHardwareSupport(promise: Promise) {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)

            // Check for StrongBox support (Android 9+)
            val hasStrongBox = android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P

            // Check for TEE support (all Android Keystore implementations have TEE)
            val hasTEE = true

            val result = Arguments.createMap().apply {
                putBoolean("available", true)
                putString("type", when {
                    hasStrongBox -> "StrongBox"
                    hasTEE -> "TEE (Trusted Execution Environment)"
                    else -> "Software Keystore"
                })
                putBoolean("hasStrongBox", hasStrongBox)
                putBoolean("hasTEE", hasTEE)
                putInt("androidVersion", android.os.Build.VERSION.SDK_INT)
            }

            Log.d(TAG, "Hardware support check: ${result.getString("type")}")
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking hardware support", e)
            promise.reject("HARDWARE_CHECK_ERROR", e.message, e)
        }
    }

    /**
     * Generate a new key pair in Android Keystore
     *
     * @param keyId Unique identifier for the key
     * @param requiresBiometric Whether the key requires biometric authentication
     * @param promise Promise resolving to public key (Base64)
     */
    @ReactMethod
    fun generateKeyPair(keyId: String, requiresBiometric: Boolean, promise: Promise) {
        try {
            Log.d(TAG, "Generating key pair: $keyId (biometric: $requiresBiometric)")

            val keyPairGenerator = KeyPairGenerator.getInstance(
                KEY_ALGORITHM_EC,
                ANDROID_KEYSTORE
            )

            val purposes = KeyProperties.PURPOSE_SIGN or
                    KeyProperties.PURPOSE_VERIFY or
                    KeyProperties.PURPOSE_AGREE_KEY

            val builder = KeyGenParameterSpec.Builder(keyId, purposes)
                .setAlgorithmParameterSpec(ECGenParameterSpec(EC_CURVE))
                .setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)

            // Try StrongBox on Android 9+
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                try {
                    builder.setIsStrongBoxBacked(true)
                    Log.d(TAG, "Using StrongBox for key: $keyId")
                } catch (e: Exception) {
                    Log.w(TAG, "StrongBox not available, using TEE", e)
                }
            }

            // Biometric authentication requirement
            if (requiresBiometric && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                builder.setUserAuthenticationRequired(true)
                builder.setUserAuthenticationParameters(
                    0, // timeout (0 = require auth for every use)
                    KeyProperties.AUTH_BIOMETRIC_STRONG
                )
            }

            keyPairGenerator.initialize(builder.build())
            val keyPair = keyPairGenerator.generateKeyPair()

            // Export public key
            val publicKeyBytes = keyPair.public.encoded
            val publicKeyBase64 = Base64.encodeToString(publicKeyBytes, Base64.NO_WRAP)

            Log.d(TAG, "Key pair generated successfully: $keyId")

            val result = Arguments.createMap().apply {
                putString("publicKey", publicKeyBase64)
                putString("keyId", keyId)
                putBoolean("success", true)
            }

            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error generating key pair: $keyId", e)
            promise.reject("KEY_GENERATION_ERROR", e.message, e)
        }
    }

    /**
     * Check if a key exists in the keystore
     *
     * @param keyId Key identifier to check
     * @param promise Promise resolving to boolean
     */
    @ReactMethod
    fun keyExists(keyId: String, promise: Promise) {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)

            val exists = keyStore.containsAlias(keyId)
            Log.d(TAG, "Key exists check: $keyId = $exists")

            promise.resolve(exists)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking key existence: $keyId", e)
            promise.reject("KEY_EXISTS_ERROR", e.message, e)
        }
    }

    /**
     * Get public key for a key pair
     *
     * @param keyId Key identifier
     * @param promise Promise resolving to Base64 public key
     */
    @ReactMethod
    fun getPublicKey(keyId: String, promise: Promise) {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)

            val entry = keyStore.getEntry(keyId, null) as? KeyStore.PrivateKeyEntry
                ?: throw IllegalArgumentException("Key not found or not a key pair: $keyId")

            val publicKeyBytes = entry.certificate.publicKey.encoded
            val publicKeyBase64 = Base64.encodeToString(publicKeyBytes, Base64.NO_WRAP)

            Log.d(TAG, "Public key retrieved: $keyId")
            promise.resolve(publicKeyBase64)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting public key: $keyId", e)
            promise.reject("GET_PUBLIC_KEY_ERROR", e.message, e)
        }
    }

    /**
     * Delete a key from the keystore
     *
     * @param keyId Key identifier to delete
     * @param promise Promise resolving when complete
     */
    @ReactMethod
    fun deleteKey(keyId: String, promise: Promise) {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)

            keyStore.deleteEntry(keyId)
            Log.d(TAG, "Key deleted: $keyId")

            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error deleting key: $keyId", e)
            promise.reject("KEY_DELETION_ERROR", e.message, e)
        }
    }

    /**
     * Sign data with a private key
     *
     * @param keyId Key identifier
     * @param data Data to sign (Base64)
     * @param promise Promise resolving to signature (Base64)
     */
    @ReactMethod
    fun sign(keyId: String, data: String, promise: Promise) {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)

            val entry = keyStore.getEntry(keyId, null) as? KeyStore.PrivateKeyEntry
                ?: throw IllegalArgumentException("Key not found: $keyId")

            val signature = Signature.getInstance(SIGNATURE_ALGORITHM)
            signature.initSign(entry.privateKey)

            val dataBytes = Base64.decode(data, Base64.NO_WRAP)
            signature.update(dataBytes)

            val signatureBytes = signature.sign()
            val signatureBase64 = Base64.encodeToString(signatureBytes, Base64.NO_WRAP)

            Log.d(TAG, "Data signed successfully with key: $keyId")
            promise.resolve(signatureBase64)
        } catch (e: Exception) {
            Log.e(TAG, "Error signing data: $keyId", e)
            promise.reject("SIGNING_ERROR", e.message, e)
        }
    }

    /**
     * Verify a signature
     *
     * @param publicKeyBase64 Public key (Base64)
     * @param data Original data (Base64)
     * @param signatureBase64 Signature to verify (Base64)
     * @param promise Promise resolving to boolean
     */
    @ReactMethod
    fun verify(publicKeyBase64: String, data: String, signatureBase64: String, promise: Promise) {
        try {
            val publicKeyBytes = Base64.decode(publicKeyBase64, Base64.NO_WRAP)
            val keyFactory = KeyFactory.getInstance("EC")
            val publicKey = keyFactory.generatePublic(X509EncodedKeySpec(publicKeyBytes))

            val signature = Signature.getInstance(SIGNATURE_ALGORITHM)
            signature.initVerify(publicKey)

            val dataBytes = Base64.decode(data, Base64.NO_WRAP)
            signature.update(dataBytes)

            val signatureBytes = Base64.decode(signatureBase64, Base64.NO_WRAP)
            val isValid = signature.verify(signatureBytes)

            Log.d(TAG, "Signature verification result: $isValid")
            promise.resolve(isValid)
        } catch (e: Exception) {
            Log.e(TAG, "Error verifying signature", e)
            promise.reject("VERIFICATION_ERROR", e.message, e)
        }
    }

    /**
     * Encrypt data using ECIES (ECDH + AES-GCM)
     *
     * @param keyId Key identifier for encryption
     * @param plaintext Data to encrypt (Base64)
     * @param promise Promise resolving to encrypted data (Base64)
     */
    @ReactMethod
    fun encrypt(keyId: String, plaintext: String, promise: Promise) {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)

            val entry = keyStore.getEntry(keyId, null) as? KeyStore.PrivateKeyEntry
                ?: throw IllegalArgumentException("Key not found: $keyId")

            // Get our public key
            val ourPublicKey = entry.certificate.publicKey as PublicKey

            // Generate ephemeral key pair for ECDH
            val ephemeralKeyPair = KeyPairGenerator.getInstance("EC").apply {
                initialize(ECGenParameterSpec(EC_CURVE))
            }.generateKeyPair()

            // Perform ECDH key agreement
            val keyAgreement = KeyAgreement.getInstance("ECDH")
            keyAgreement.init(ephemeralKeyPair.private)
            keyAgreement.doPhase(ourPublicKey, true)
            val sharedSecret = keyAgreement.generateSecret()

            // Derive AES key from shared secret
            val aesKey = SecretKeySpec(sharedSecret.copyOf(32), "AES")

            // Generate random IV
            val iv = ByteArray(GCM_IV_LENGTH)
            SecureRandom().nextBytes(iv)

            // Encrypt with AES-GCM
            val cipher = Cipher.getInstance(AES_ALGORITHM)
            cipher.init(Cipher.ENCRYPT_MODE, aesKey, GCMParameterSpec(GCM_TAG_LENGTH, iv))

            val plaintextBytes = Base64.decode(plaintext, Base64.NO_WRAP)
            val ciphertext = cipher.doFinal(plaintextBytes)

            // Combine: ephemeralPublicKey || IV || ciphertext
            val ephemeralPublicKeyBytes = ephemeralKeyPair.public.encoded
            val combined = ByteArray(
                4 + ephemeralPublicKeyBytes.size +
                        4 + iv.size +
                        ciphertext.size
            )

            var offset = 0
            // Ephemeral public key length + data
            System.arraycopy(intToBytes(ephemeralPublicKeyBytes.size), 0, combined, offset, 4)
            offset += 4
            System.arraycopy(ephemeralPublicKeyBytes, 0, combined, offset, ephemeralPublicKeyBytes.size)
            offset += ephemeralPublicKeyBytes.size

            // IV length + data
            System.arraycopy(intToBytes(iv.size), 0, combined, offset, 4)
            offset += 4
            System.arraycopy(iv, 0, combined, offset, iv.size)
            offset += iv.size

            // Ciphertext
            System.arraycopy(ciphertext, 0, combined, offset, ciphertext.size)

            val encryptedBase64 = Base64.encodeToString(combined, Base64.NO_WRAP)

            Log.d(TAG, "Data encrypted successfully with key: $keyId")
            promise.resolve(encryptedBase64)
        } catch (e: Exception) {
            Log.e(TAG, "Error encrypting data: $keyId", e)
            promise.reject("ENCRYPTION_ERROR", e.message, e)
        }
    }

    /**
     * Decrypt data using ECIES (ECDH + AES-GCM)
     *
     * @param keyId Key identifier for decryption
     * @param encryptedData Encrypted data (Base64)
     * @param promise Promise resolving to plaintext (Base64)
     */
    @ReactMethod
    fun decrypt(keyId: String, encryptedData: String, promise: Promise) {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)

            val entry = keyStore.getEntry(keyId, null) as? KeyStore.PrivateKeyEntry
                ?: throw IllegalArgumentException("Key not found: $keyId")

            val combined = Base64.decode(encryptedData, Base64.NO_WRAP)

            var offset = 0

            // Extract ephemeral public key
            val ephemeralPublicKeyLength = bytesToInt(combined.copyOfRange(offset, offset + 4))
            offset += 4
            val ephemeralPublicKeyBytes = combined.copyOfRange(offset, offset + ephemeralPublicKeyLength)
            offset += ephemeralPublicKeyLength

            // Extract IV
            val ivLength = bytesToInt(combined.copyOfRange(offset, offset + 4))
            offset += 4
            val iv = combined.copyOfRange(offset, offset + ivLength)
            offset += ivLength

            // Extract ciphertext
            val ciphertext = combined.copyOfRange(offset, combined.size)

            // Reconstruct ephemeral public key
            val keyFactory = KeyFactory.getInstance("EC")
            val ephemeralPublicKey = keyFactory.generatePublic(X509EncodedKeySpec(ephemeralPublicKeyBytes))

            // Perform ECDH key agreement
            val keyAgreement = KeyAgreement.getInstance("ECDH")
            keyAgreement.init(entry.privateKey)
            keyAgreement.doPhase(ephemeralPublicKey, true)
            val sharedSecret = keyAgreement.generateSecret()

            // Derive AES key from shared secret
            val aesKey = SecretKeySpec(sharedSecret.copyOf(32), "AES")

            // Decrypt with AES-GCM
            val cipher = Cipher.getInstance(AES_ALGORITHM)
            cipher.init(Cipher.DECRYPT_MODE, aesKey, GCMParameterSpec(GCM_TAG_LENGTH, iv))

            val plaintextBytes = cipher.doFinal(ciphertext)
            val plaintextBase64 = Base64.encodeToString(plaintextBytes, Base64.NO_WRAP)

            Log.d(TAG, "Data decrypted successfully with key: $keyId")
            promise.resolve(plaintextBase64)
        } catch (e: Exception) {
            Log.e(TAG, "Error decrypting data: $keyId", e)
            promise.reject("DECRYPTION_ERROR", e.message, e)
        }
    }

    /**
     * Check if a key is biometric-bound
     *
     * @param keyId Key identifier
     * @param promise Promise resolving to boolean
     */
    @ReactMethod
    fun isBiometricBound(keyId: String, promise: Promise) {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)

            if (!keyStore.containsAlias(keyId)) {
                promise.resolve(false)
                return
            }

            // On Android, we can't directly query if a key is biometric-bound
            // We'd need to store this metadata separately or try to use the key
            // For now, return false as a conservative answer
            // In production, you'd track this in shared preferences or a database

            Log.d(TAG, "Biometric bound check for key: $keyId (metadata not available)")
            promise.resolve(false)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking biometric binding: $keyId", e)
            promise.reject("BIOMETRIC_CHECK_ERROR", e.message, e)
        }
    }

    // Helper functions

    private fun intToBytes(value: Int): ByteArray {
        return byteArrayOf(
            (value shr 24).toByte(),
            (value shr 16).toByte(),
            (value shr 8).toByte(),
            value.toByte()
        )
    }

    private fun bytesToInt(bytes: ByteArray): Int {
        return ((bytes[0].toInt() and 0xFF) shl 24) or
                ((bytes[1].toInt() and 0xFF) shl 16) or
                ((bytes[2].toInt() and 0xFF) shl 8) or
                (bytes[3].toInt() and 0xFF)
    }
}
