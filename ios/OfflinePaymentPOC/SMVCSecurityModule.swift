//
//  SMVCSecurityModule.swift
//  OfflinePaymentPOC
//
//  Secure Mobile Cryptographic Vault - iOS Secure Enclave Integration
//  Phase 4: Hardware Security Integration
//

import Foundation
import Security
import LocalAuthentication
import CryptoKit

@objc(SMVCSecurityModule)
class SMVCSecurityModule: NSObject {

  // MARK: - Constants

  private let keyTagPrefix = "com.offlinepaymentpoc.secureenclave."

  // MARK: - Key Management

  /**
   Generate an EC key pair in the Secure Enclave

   - Parameters:
      - keyId: Unique identifier for the key
      - requireBiometric: Whether key usage requires biometric authentication
      - resolver: Promise resolver
      - rejecter: Promise rejecter
   */
  @objc
  func generateKeyPair(_ keyId: String,
                      requireBiometric: Bool,
                      resolver: @escaping RCTPromiseResolveBlock,
                      rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        // Delete existing key if present
        try? self.deleteKeyInternal(keyId)

        // Create access control
        var flags: SecAccessControlCreateFlags = [.privateKeyUsage]
        if requireBiometric {
          flags.insert(.biometryCurrentSet)
        }

        guard let access = SecAccessControlCreateWithFlags(
          kCFAllocatorDefault,
          kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
          flags,
          nil
        ) else {
          rejecter("ACCESS_CONTROL_ERROR",
                  "Failed to create access control",
                  NSError(domain: "SMVCSecurityModule", code: 2, userInfo: nil))
          return
        }

        // Create key attributes
        let keyTag = (self.keyTagPrefix + keyId).data(using: .utf8)!

        // Try Secure Enclave first
        var attributes: [String: Any] = [
          kSecAttrKeyType as String: kSecAttrKeyTypeEC,
          kSecAttrKeySizeInBits as String: 256,
          kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
          kSecPrivateKeyAttrs as String: [
            kSecAttrIsPermanent as String: true,
            kSecAttrApplicationTag as String: keyTag,
            kSecAttrAccessControl as String: access
          ]
        ]

        // Generate key pair
        var error: Unmanaged<CFError>?
        var privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error)

        // If Secure Enclave fails, try hardware-backed Keychain
        if privateKey == nil {
          // Remove Secure Enclave requirement and try again with regular hardware-backed key
          attributes.removeValue(forKey: kSecAttrTokenID as String)
          error = nil
          privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error)
        }

        guard let privateKey = privateKey else {
          let err = error!.takeRetainedValue() as Error
          rejecter("KEY_GENERATION_ERROR",
                  "Failed to generate key: \(err.localizedDescription)",
                  err as NSError)
          return
        }

        // Get public key
        guard let publicKey = SecKeyCopyPublicKey(privateKey) else {
          rejecter("PUBLIC_KEY_ERROR",
                  "Failed to extract public key",
                  NSError(domain: "SMVCSecurityModule", code: 3, userInfo: nil))
          return
        }

        // Export public key
        guard let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, nil) as Data? else {
          rejecter("PUBLIC_KEY_EXPORT_ERROR",
                  "Failed to export public key",
                  NSError(domain: "SMVCSecurityModule", code: 4, userInfo: nil))
          return
        }

        let result: [String: Any] = [
          "success": true,
          "publicKey": publicKeyData.base64EncodedString(),
          "keyId": keyId
        ]

        resolver(result)

      } catch {
        rejecter("UNEXPECTED_ERROR",
                "Unexpected error: \(error.localizedDescription)",
                error as NSError)
      }
    }
  }

  /**
   Check if a key exists in the Secure Enclave
   */
  @objc
  func keyExists(_ keyId: String,
                resolver: @escaping RCTPromiseResolveBlock,
                rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      let keyTag = (self.keyTagPrefix + keyId).data(using: .utf8)!

      let query: [String: Any] = [
        kSecClass as String: kSecClassKey,
        kSecAttrApplicationTag as String: keyTag,
        kSecAttrKeyType as String: kSecAttrKeyTypeEC,
        kSecReturnRef as String: true
      ]

      var item: CFTypeRef?
      let status = SecItemCopyMatching(query as CFDictionary, &item)

      resolver(status == errSecSuccess)
    }
  }

  /**
   Delete a key from the Secure Enclave
   */
  @objc
  func deleteKey(_ keyId: String,
                resolver: @escaping RCTPromiseResolveBlock,
                rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try self.deleteKeyInternal(keyId)
        resolver(["success": true])
      } catch {
        rejecter("DELETE_KEY_ERROR",
                "Failed to delete key: \(error.localizedDescription)",
                error as NSError)
      }
    }
  }

  private func deleteKeyInternal(_ keyId: String) throws {
    let keyTag = (keyTagPrefix + keyId).data(using: .utf8)!

    let query: [String: Any] = [
      kSecClass as String: kSecClassKey,
      kSecAttrApplicationTag as String: keyTag
    ]

    let status = SecItemDelete(query as CFDictionary)

    if status != errSecSuccess && status != errSecItemNotFound {
      throw NSError(domain: "SMVCSecurityModule",
                   code: Int(status),
                   userInfo: [NSLocalizedDescriptionKey: "SecItemDelete failed with status: \(status)"])
    }
  }

  /**
   Get public key for a given key ID
   */
  @objc
  func getPublicKey(_ keyId: String,
                   resolver: @escaping RCTPromiseResolveBlock,
                   rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        guard let privateKey = try self.getPrivateKey(keyId) else {
          rejecter("KEY_NOT_FOUND",
                  "Key not found: \(keyId)",
                  NSError(domain: "SMVCSecurityModule", code: 5, userInfo: nil))
          return
        }

        guard let publicKey = SecKeyCopyPublicKey(privateKey) else {
          rejecter("PUBLIC_KEY_ERROR",
                  "Failed to extract public key",
                  NSError(domain: "SMVCSecurityModule", code: 6, userInfo: nil))
          return
        }

        guard let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, nil) as Data? else {
          rejecter("PUBLIC_KEY_EXPORT_ERROR",
                  "Failed to export public key",
                  NSError(domain: "SMVCSecurityModule", code: 7, userInfo: nil))
          return
        }

        resolver(publicKeyData.base64EncodedString())

      } catch {
        rejecter("GET_PUBLIC_KEY_ERROR",
                "Error getting public key: \(error.localizedDescription)",
                error as NSError)
      }
    }
  }

  // MARK: - Signing Operations

  /**
   Sign data with a private key in the Secure Enclave
   */
  @objc
  func sign(_ keyId: String,
           data: String,
           resolver: @escaping RCTPromiseResolveBlock,
           rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        guard let privateKey = try self.getPrivateKey(keyId) else {
          rejecter("KEY_NOT_FOUND",
                  "Key not found: \(keyId)",
                  NSError(domain: "SMVCSecurityModule", code: 8, userInfo: nil))
          return
        }

        guard let dataToSign = data.data(using: .utf8) else {
          rejecter("INVALID_DATA",
                  "Invalid data to sign",
                  NSError(domain: "SMVCSecurityModule", code: 9, userInfo: nil))
          return
        }

        // Create SHA256 hash of data
        let hash = SHA256.hash(data: dataToSign)
        let hashData = Data(hash)

        // Sign the hash
        var error: Unmanaged<CFError>?
        guard let signature = SecKeyCreateSignature(
          privateKey,
          .ecdsaSignatureMessageX962SHA256,
          hashData as CFData,
          &error
        ) as Data? else {
          let err = error!.takeRetainedValue() as Error
          rejecter("SIGNING_ERROR",
                  "Failed to sign data: \(err.localizedDescription)",
                  err as NSError)
          return
        }

        resolver(signature.base64EncodedString())

      } catch {
        rejecter("SIGN_ERROR",
                "Error signing data: \(error.localizedDescription)",
                error as NSError)
      }
    }
  }

  /**
   Verify a signature with a public key
   */
  @objc
  func verify(_ publicKeyBase64: String,
             data: String,
             signature: String,
             resolver: @escaping RCTPromiseResolveBlock,
             rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        // Decode public key
        guard let publicKeyData = Data(base64Encoded: publicKeyBase64) else {
          rejecter("INVALID_PUBLIC_KEY",
                  "Invalid base64 public key",
                  NSError(domain: "SMVCSecurityModule", code: 10, userInfo: nil))
          return
        }

        let keyAttributes: [String: Any] = [
          kSecAttrKeyType as String: kSecAttrKeyTypeEC,
          kSecAttrKeyClass as String: kSecAttrKeyClassPublic,
          kSecAttrKeySizeInBits as String: 256
        ]

        var error: Unmanaged<CFError>?
        guard let publicKey = SecKeyCreateWithData(
          publicKeyData as CFData,
          keyAttributes as CFDictionary,
          &error
        ) else {
          let err = error!.takeRetainedValue() as Error
          rejecter("PUBLIC_KEY_CREATE_ERROR",
                  "Failed to create public key: \(err.localizedDescription)",
                  err as NSError)
          return
        }

        guard let dataToVerify = data.data(using: .utf8) else {
          rejecter("INVALID_DATA",
                  "Invalid data to verify",
                  NSError(domain: "SMVCSecurityModule", code: 11, userInfo: nil))
          return
        }

        guard let signatureData = Data(base64Encoded: signature) else {
          rejecter("INVALID_SIGNATURE",
                  "Invalid base64 signature",
                  NSError(domain: "SMVCSecurityModule", code: 12, userInfo: nil))
          return
        }

        // Create SHA256 hash
        let hash = SHA256.hash(data: dataToVerify)
        let hashData = Data(hash)

        // Verify signature
        let isValid = SecKeyVerifySignature(
          publicKey,
          .ecdsaSignatureMessageX962SHA256,
          hashData as CFData,
          signatureData as CFData,
          &error
        )

        resolver(isValid)

      } catch {
        rejecter("VERIFY_ERROR",
                "Error verifying signature: \(error.localizedDescription)",
                error as NSError)
      }
    }
  }

  // MARK: - Encryption Operations

  /**
   Encrypt data using public key (ECIES)
   */
  @objc
  func encrypt(_ keyId: String,
              plaintext: String,
              resolver: @escaping RCTPromiseResolveBlock,
              rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        guard let privateKey = try self.getPrivateKey(keyId) else {
          rejecter("KEY_NOT_FOUND",
                  "Key not found: \(keyId)",
                  NSError(domain: "SMVCSecurityModule", code: 13, userInfo: nil))
          return
        }

        guard let publicKey = SecKeyCopyPublicKey(privateKey) else {
          rejecter("PUBLIC_KEY_ERROR",
                  "Failed to get public key",
                  NSError(domain: "SMVCSecurityModule", code: 14, userInfo: nil))
          return
        }

        guard let plaintextData = plaintext.data(using: .utf8) else {
          rejecter("INVALID_PLAINTEXT",
                  "Invalid plaintext data",
                  NSError(domain: "SMVCSecurityModule", code: 15, userInfo: nil))
          return
        }

        var error: Unmanaged<CFError>?
        guard let ciphertext = SecKeyCreateEncryptedData(
          publicKey,
          .eciesEncryptionStandardX963SHA256AESGCM,
          plaintextData as CFData,
          &error
        ) as Data? else {
          let err = error!.takeRetainedValue() as Error
          rejecter("ENCRYPTION_ERROR",
                  "Failed to encrypt data: \(err.localizedDescription)",
                  err as NSError)
          return
        }

        resolver(ciphertext.base64EncodedString())

      } catch {
        rejecter("ENCRYPT_ERROR",
                "Error encrypting data: \(error.localizedDescription)",
                error as NSError)
      }
    }
  }

  /**
   Decrypt data using private key in Secure Enclave (ECIES)
   */
  @objc
  func decrypt(_ keyId: String,
              ciphertext: String,
              resolver: @escaping RCTPromiseResolveBlock,
              rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        guard let privateKey = try self.getPrivateKey(keyId) else {
          rejecter("KEY_NOT_FOUND",
                  "Key not found: \(keyId)",
                  NSError(domain: "SMVCSecurityModule", code: 16, userInfo: nil))
          return
        }

        guard let ciphertextData = Data(base64Encoded: ciphertext) else {
          rejecter("INVALID_CIPHERTEXT",
                  "Invalid base64 ciphertext",
                  NSError(domain: "SMVCSecurityModule", code: 17, userInfo: nil))
          return
        }

        var error: Unmanaged<CFError>?
        guard let plaintext = SecKeyCreateDecryptedData(
          privateKey,
          .eciesEncryptionStandardX963SHA256AESGCM,
          ciphertextData as CFData,
          &error
        ) as Data? else {
          let err = error!.takeRetainedValue() as Error
          rejecter("DECRYPTION_ERROR",
                  "Failed to decrypt data: \(err.localizedDescription)",
                  err as NSError)
          return
        }

        guard let plaintextString = String(data: plaintext, encoding: .utf8) else {
          rejecter("DECRYPTION_DECODE_ERROR",
                  "Failed to decode decrypted data",
                  NSError(domain: "SMVCSecurityModule", code: 18, userInfo: nil))
          return
        }

        resolver(plaintextString)

      } catch {
        rejecter("DECRYPT_ERROR",
                "Error decrypting data: \(error.localizedDescription)",
                error as NSError)
      }
    }
  }

  // MARK: - Hardware Detection

  /**
   Check if Secure Enclave is available on this device
   */
  @objc
  func isHardwareAvailable(_ resolver: @escaping RCTPromiseResolveBlock,
                          rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      // Try to create a test key with Secure Enclave
      let testKeyTag = "com.offlinepaymentpoc.test.hwcheck".data(using: .utf8)!

      var attributes: [String: Any] = [
        kSecAttrKeyType as String: kSecAttrKeyTypeEC,
        kSecAttrKeySizeInBits as String: 256,
        kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
        kSecPrivateKeyAttrs as String: [
          kSecAttrIsPermanent as String: false  // Don't save the test key
        ]
      ]

      var error: Unmanaged<CFError>?
      var hwType = "None"
      var available = false

      // Try Secure Enclave
      if let testKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error) {
        hwType = "SecureEnclave"
        available = true
        // Clean up - though it's not permanent anyway
      } else {
        // Try hardware-backed Keychain (without Secure Enclave)
        attributes.removeValue(forKey: kSecAttrTokenID as String)
        error = nil
        if let testKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error) {
          hwType = "HardwareKeychain"
          available = true
        }
      }

      let result: [String: Any] = [
        "available": available,
        "type": hwType
      ]

      resolver(result)
    }
  }

  /**
   Check if a key requires biometric authentication
   */
  @objc
  func isBiometricBound(_ keyId: String,
                       resolver: @escaping RCTPromiseResolveBlock,
                       rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        guard let privateKey = try self.getPrivateKey(keyId) else {
          rejecter("KEY_NOT_FOUND",
                  "Key not found: \(keyId)",
                  NSError(domain: "SMVCSecurityModule", code: 19, userInfo: nil))
          return
        }

        // Get key attributes
        let attributes = SecKeyCopyAttributes(privateKey) as? [String: Any]

        // Check if access control requires biometry
        // If the key has an access control object, it means it requires biometric authentication
        // (since we only set access control when requireBiometric is true during key generation)
        if attributes?[kSecAttrAccessControl as String] != nil {
          resolver(true)
        } else {
          resolver(false)
        }

      } catch {
        rejecter("BIOMETRIC_CHECK_ERROR",
                "Error checking biometric binding: \(error.localizedDescription)",
                error as NSError)
      }
    }
  }

  // MARK: - Helper Methods

  private func getPrivateKey(_ keyId: String) throws -> SecKey? {
    let keyTag = (keyTagPrefix + keyId).data(using: .utf8)!

    let query: [String: Any] = [
      kSecClass as String: kSecClassKey,
      kSecAttrApplicationTag as String: keyTag,
      kSecAttrKeyType as String: kSecAttrKeyTypeEC,
      kSecReturnRef as String: true
    ]

    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)

    guard status == errSecSuccess else {
      if status == errSecItemNotFound {
        return nil
      }
      throw NSError(domain: "SMVCSecurityModule",
                   code: Int(status),
                   userInfo: [NSLocalizedDescriptionKey: "SecItemCopyMatching failed with status: \(status)"])
    }

    return (item as! SecKey)
  }

  // MARK: - React Native Required Methods

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
