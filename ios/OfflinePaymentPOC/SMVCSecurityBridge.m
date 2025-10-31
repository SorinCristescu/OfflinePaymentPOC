//
//  SMVCSecurityBridge.m
//  OfflinePaymentPOC
//
//  Objective-C bridge for SMVCSecurityModule Swift implementation
//  Exposes Swift methods to React Native
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SMVCSecurityModule, NSObject)

// MARK: - Key Management

RCT_EXTERN_METHOD(generateKeyPair:(NSString *)keyId
                  requireBiometric:(BOOL)requireBiometric
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(keyExists:(NSString *)keyId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deleteKey:(NSString *)keyId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getPublicKey:(NSString *)keyId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// MARK: - Signing Operations

RCT_EXTERN_METHOD(sign:(NSString *)keyId
                  data:(NSString *)data
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(verify:(NSString *)publicKeyBase64
                  data:(NSString *)data
                  signature:(NSString *)signature
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// MARK: - Encryption Operations

RCT_EXTERN_METHOD(encrypt:(NSString *)keyId
                  plaintext:(NSString *)plaintext
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(decrypt:(NSString *)keyId
                  ciphertext:(NSString *)ciphertext
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// MARK: - Hardware Detection

RCT_EXTERN_METHOD(isHardwareAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isBiometricBound:(NSString *)keyId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
