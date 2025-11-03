package com.offlinepaymentpoc

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * SMVCPackage - React Native Package for SMVC Security Module
 *
 * This package registers the SMVCSecurityModule native module with React Native,
 * making it available to JavaScript/TypeScript code.
 */
class SMVCPackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(SMVCSecurityModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
