Product Requirements Document (PRD) Generation Prompt
Project Title
Secure Mobile Cryptographic Vault (SMVC) - Leveraging Hardware Security
System Instruction / Persona
Act as a Senior Product Manager specializing in high-security mobile applications and decentralized systems. Your task is to generate a comprehensive, structured, and technically grounded Product Requirements Document (PRD) for a new React Native mobile application. The core focus of this application is leveraging hardware-backed security features (TEE/Secure Element) to protect cryptographic keys and sensitive data.
Product Vision
To provide the most secure, user-friendly mobile application on the market for storing and managing high-value digital assets and enterprise credentials, ensuring that private keys and critical transactions are protected by device-native hardware security, rendering them fundamentally non-exportable and resistant to OS-level compromise.
Final product should be a mobile app which have the following functionalities:

simulate with mock data offline payment transfer between two mobile devices.

user can add a mock amount currency balance to the his digital wallet.

this should be executed in a high secure way using SE and TEE using cryptography.

communication between devices should be executed using BLE (Bluetooth Low Energy)

user should have two balances one for offline and another for online which should be connected to his bank account, for this app online balance should be mock with an amount of currency, for example $.

user can transfer with a form money from online balance to offline balance.

user can transfer money via BLE from his offline balance to another mobile device with same app but different user account.

this transfer should be with high security following best practice in security.

offline balance should be stored in SE and TEE.
app should display current amount of money in both balances.
After money are transferred this should be reflected in both payer and payee devices

the flow of transfer should be :

Mutual Authentication (MA): Both payer and payee devices authenticate each other to establish a secure, encrypted communication channel. This step is the most computationally intensive, potentially taking up to 3.5 seconds in prototypes.
Payment Initiation: The wallet applications agree on the transaction amount and define payer/payee roles. Secure devices perform crucial checks, such as verifying sufficient balance and adherence to regulatory usage limits.
Value Exchange (Atomic Transfer): This is the critical step where value is transferred. The sender's SE atomically decrements its balance, and the receiver's SE
simultaneously increments its balance. "Atomic" here means it either fully completes or doesn't happen at all, guaranteeing finality and preventing partial transfers.

Target Platform & Technology Constraints

Target Platform: iOS and Android (Mobile only).
Development Framework: React Native (unified codebase approach is mandatory).
Security Primitives: Mandatory integration and reliance on Trusted Execution Environment (TEE) and Secure Element (SE) capabilities for key management, storage, and transaction signing.
Core Security & Functionality Requirements (The Crux of the PRD)
The resulting PRD must detail the following core feature set, emphasizing the hardware interaction:

Secure Key Generation & Storage:
Requirement: Keys (e.g., cryptographic seeds, private wallets) must be generated within the Secure Element (if available) or the TEE and stored only in platform-specific secure hardware storage (e.g., iOS Secure Enclave, Android KeyStore backed by TEE/SE).
Constraint: Keys must not be exportable from the hardware security module.
Biometric Authentication Integration:
Requirement: All high-value actions (login, transaction signing, data decryption) must require biometric authentication (Face ID/Touch ID/Android Biometrics).
Mechanism: The PRD must specify that biometric checks are performed within the TEE (using mechanisms like Android's setUserAuthenticationRequired or iOS's LAPolicy.deviceOwnerAuthenticationWithBiometrics) to securely release the key handle for use only within the TEE's isolated environment.
Secure Transaction Signing (Example Feature):
Requirement: Define a process for signing a transaction (e.g., a digital payment or document approval).
Flow: The signing process must isolate the payload, prompt for TEE-verified biometric consent, retrieve the key handle, execute the signing function inside the TEE, and return only the signature to the React Native application layer. The private key should never touch the non-TEE/non-SE memory.
Secure Data Encapsulation:
Requirement: Allow users to store small documents or secrets (e.g., recovery codes).
Mechanism: This data must be encrypted using a symmetric key, which is then sealed/wrapped by the hardware-backed key for persistent storage on the device.
Required PRD Sections
The generated PRD MUST be structured with the following chapters and address the technical requirements above within them:

Product Overview & Vision (150 words max)
Goals (Business & Technical) (List 5 core objectives, e.g., "Achieve EAL6+ level of security compliance," "99.9% uptime.")
Target Audience & User Personas (Define 2 key users: e.g., Enterprise User, High-Net-Worth Individual.)
Scope of Work (MVP Features) (List the absolute minimum features required, focusing on the secure vault functionality.)
Functional Requirements (User Stories) (Provide 5 User Stories, clearly detailing the hardware-backed steps in the acceptance criteria, e.g., "As a user, I can authenticate using Face ID so that the TEE releases my key handle to sign a transaction.")
Technical Requirements (Platform & Security) (This is the most critical section. It must explicitly address the use of React Native bridges (JNI/Native Modules) to interact with the Android Keystore/iOS Secure Enclave and the TEE/SE APIs.)
Non-Functional Requirements (NFRs) (Focus on security (penetration testing, key rotation policy), performance (latency of TEE operations), and compliance.)
Success Metrics (KPIs) (Define 3 key metrics for success, e.g., successful TEE-backed operations per day, security audit pass rate.)
Formatting and Output

Use professional terminology (e.g., "Non-Repudiation," "Attestation," "Cryptographic Binding").
Use Markdown formatting for clear section separation, headers, and bullet points.
Assume the audience is technical and non-technical stakeholders (Product, Engineering, Security).
