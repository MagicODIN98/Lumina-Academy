// ============================================
// FIREBASE AUTHENTICATION MODULE
// Handles user authentication and profile management
// ============================================

/**
 * Register a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {object} userProfile - User profile data (firstName, lastName, university, etc.)
 * @returns {Promise} Registration promise
 */
async function registerUser(email, password, userProfile) {
    try {
        // Create user account with email and password
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Store additional user profile data in Realtime Database
        await saveUserProfile(user.uid, {
            email: email,
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            university: userProfile.university,
            universityName: userProfile.universityName,
            universityImage: userProfile.universityImage,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        // Store user ID in localStorage for quick access
        localStorage.setItem('userId', user.uid);
        
        return {
            success: true,
            userId: user.uid,
            message: 'Usuario registrado exitosamente'
        };
    } catch (error) {
        console.error('Registration error:', error);
        return {
            success: false,
            error: error.message,
            message: getFirebaseErrorMessage(error.code)
        };
    }
}

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} Login promise
 */
async function loginUser(email, password) {
    try {
        // Authenticate user with email and password
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Store user ID in localStorage
        localStorage.setItem('userId', user.uid);
        
        // Fetch and store user profile
        const userProfile = await getUserProfile(user.uid);
        
        return {
            success: true,
            userId: user.uid,
            userProfile: userProfile,
            message: 'Sesión iniciada exitosamente'
        };
    } catch (error) {
        console.error('Login error:', error);
        return {
            success: false,
            error: error.message,
            message: getFirebaseErrorMessage(error.code)
        };
    }
}

/**
 * Logout current user
 * @returns {Promise} Logout promise
 */
async function logoutUser() {
    try {
        await firebase.auth().signOut();
        localStorage.removeItem('userId');
        return {
            success: true,
            message: 'Sesión cerrada exitosamente'
        };
    } catch (error) {
        console.error('Logout error:', error);
        return {
            success: false,
            error: error.message,
            message: 'Error al cerrar sesión'
        };
    }
}

/**
 * Get current authenticated user
 * @returns {Promise} Current user data or null
 */
function getCurrentUser() {
    return new Promise((resolve) => {
        firebase.auth().onAuthStateChanged((user) => {
            resolve(user);
        });
    });
}

/**
 * Save user profile to database
 * @param {string} userId - Firebase user ID
 * @param {object} profileData - User profile data
 * @returns {Promise} Save promise
 */
async function saveUserProfile(userId, profileData) {
    try {
        const ref = firebase.database().ref(`users/${userId}`);
        await ref.set(profileData);
        return {
            success: true,
            message: 'Perfil guardado exitosamente'
        };
    } catch (error) {
        console.error('Error saving profile:', error);
        return {
            success: false,
            error: error.message,
            message: 'Error al guardar el perfil'
        };
    }
}

/**
 * Get user profile from database
 * @param {string} userId - Firebase user ID
 * @returns {Promise} User profile data
 */
async function getUserProfile(userId) {
    try {
        const ref = firebase.database().ref(`users/${userId}`);
        const snapshot = await ref.once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Error getting profile:', error);
        return null;
    }
}

/**
 * Update user profile data
 * @param {string} userId - Firebase user ID
 * @param {object} updates - Fields to update
 * @returns {Promise} Update promise
 */
async function updateUserProfile(userId, updates) {
    try {
        const ref = firebase.database().ref(`users/${userId}`);
        updates.updatedAt = new Date().toISOString();
        await ref.update(updates);
        
        return {
            success: true,
            message: 'Perfil actualizado exitosamente'
        };
    } catch (error) {
        console.error('Error updating profile:', error);
        return {
            success: false,
            error: error.message,
            message: 'Error al actualizar el perfil'
        };
    }
}

/**
 * Update user email
 * @param {string} newEmail - New email address
 * @returns {Promise} Update promise
 */
async function updateUserEmail(newEmail) {
    try {
        const user = await getCurrentUser();
        if (user) {
            await user.updateEmail(newEmail);
            
            // Update email in database profile
            await updateUserProfile(user.uid, { email: newEmail });
            
            return {
                success: true,
                message: 'Correo actualizado exitosamente'
            };
        }
    } catch (error) {
        console.error('Error updating email:', error);
        return {
            success: false,
            error: error.message,
            message: getFirebaseErrorMessage(error.code)
        };
    }
}

/**
 * Update user password
 * @param {string} newPassword - New password
 * @returns {Promise} Update promise
 */
async function updateUserPassword(newPassword) {
    try {
        const user = await getCurrentUser();
        if (user) {
            await user.updatePassword(newPassword);
            return {
                success: true,
                message: 'Contraseña actualizada exitosamente'
            };
        }
    } catch (error) {
        console.error('Error updating password:', error);
        return {
            success: false,
            error: error.message,
            message: getFirebaseErrorMessage(error.code)
        };
    }
}

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise} Reset promise
 */
async function sendPasswordReset(email) {
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        return {
            success: true,
            message: 'Correo de recuperación enviado'
        };
    } catch (error) {
        console.error('Error sending password reset:', error);
        return {
            success: false,
            error: error.message,
            message: getFirebaseErrorMessage(error.code)
        };
    }
}

/**
 * Convert Firebase error codes to user-friendly messages
 * @param {string} code - Firebase error code
 * @returns {string} User-friendly error message
 */
function getFirebaseErrorMessage(code) {
    const errorMessages = {
        'auth/email-already-in-use': 'Este correo ya está registrado',
        'auth/invalid-email': 'Correo inválido',
        'auth/weak-password': 'La contraseña es muy débil (mínimo 6 caracteres)',
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
        'auth/user-disabled': 'Esta cuenta ha sido desactivada',
        'auth/requires-recent-login': 'Por favor inicia sesión de nuevo para confirmar',
        'auth/operation-not-allowed': 'Esta operación no está permitida'
    };
    
    return errorMessages[code] || 'Error de autenticación. Intenta de nuevo';
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} True if user is authenticated
 */
async function isUserAuthenticated() {
    const user = await getCurrentUser();
    return user !== null;
}

/**
 * Delete user account (dangerous operation)
 * @param {string} userId - Firebase user ID
 * @returns {Promise} Deletion promise
 */
async function deleteUserAccount(userId) {
    try {
        const user = await getCurrentUser();
        if (user && user.uid === userId) {
            // Delete user profile from database
            const ref = firebase.database().ref(`users/${userId}`);
            await ref.remove();
            
            // Delete user authentication
            await user.delete();
            
            localStorage.removeItem('userId');
            
            return {
                success: true,
                message: 'Cuenta eliminada exitosamente'
            };
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        return {
            success: false,
            error: error.message,
            message: getFirebaseErrorMessage(error.code)
        };
    }
}
