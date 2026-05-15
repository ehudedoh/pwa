const database = {
    async init() {
        // No-op for Firestore, but we can check if it's ready
        console.log("Database Module Loaded using Firestore");
    },

    handleError(error, operationType, path) {
        const errInfo = {
            error: error instanceof Error ? error.message : String(error),
            authInfo: {
                userId: window.firebaseAuth?.currentUser?.uid,
                email: window.firebaseAuth?.currentUser?.email,
                emailVerified: window.firebaseAuth?.currentUser?.emailVerified
            },
            operationType,
            path
        };
        console.error('Firestore Error: ', JSON.stringify(errInfo));
        throw new Error(JSON.stringify(errInfo));
    },

    async saveUser(user) {
        const { doc, setDoc } = window.FirebaseSDK.firestore;
        const path = `users/${user.id}`;
        try {
            await setDoc(doc(window.firebaseDB, path), user);
        } catch (e) {
            this.handleError(e, 'write', path);
        }
    },

    async getUsers() {
        const { collection, getDocs } = window.FirebaseSDK.firestore;
        const path = 'users';
        try {
            const snapshot = await getDocs(collection(window.firebaseDB, path));
            return snapshot.docs.map(doc => doc.data());
        } catch (e) {
            this.handleError(e, 'list', path);
        }
    },

    async getUser(id) {
        const { doc, getDoc } = window.FirebaseSDK.firestore;
        const path = `users/${id}`;
        try {
            const docSnap = await getDoc(doc(window.firebaseDB, path));
            return docSnap.exists() ? docSnap.data() : null;
        } catch (e) {
            this.handleError(e, 'get', path);
        }
    },

    async addLot(lot) {
        const { doc, setDoc } = window.FirebaseSDK.firestore;
        const path = `lots/${lot.id}`;
        try {
            const cleanValue = (value) => {
                if (value === undefined) return undefined;
                if (value === null || value instanceof Date) return value;
                if (Array.isArray(value)) return value.map(cleanValue).filter((item) => item !== undefined);
                if (typeof value === 'object') {
                    return Object.fromEntries(
                        Object.entries(value)
                            .map(([key, entry]) => [key, cleanValue(entry)])
                            .filter(([, entry]) => entry !== undefined)
                    );
                }
                return value;
            };
            const cleanedLot = cleanValue(lot);

            // Ensure timestamp is a Date for Firestore
            if (cleanedLot.timestamp && !(cleanedLot.timestamp instanceof Date)) {
                cleanedLot.timestamp = new Date(cleanedLot.timestamp);
            }
            await setDoc(doc(window.firebaseDB, path), cleanedLot);
        } catch (e) {
            this.handleError(e, 'write', path);
        }
    },

    async getLot(id) {
        const { doc, getDoc } = window.FirebaseSDK.firestore;
        const path = `lots/${id}`;
        try {
            const docSnap = await getDoc(doc(window.firebaseDB, path));
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Convert Firestore Timestamp to Date
                if (data.timestamp && data.timestamp.toDate) data.timestamp = data.timestamp.toDate();
                return data;
            }
            return null;
        } catch (e) {
            this.handleError(e, 'get', path);
        }
    },

    async updateLot(lot) {
        const { doc, updateDoc } = window.FirebaseSDK.firestore;
        const path = `lots/${lot.id}`;
        try {
            const updateData = { ...lot };
            delete updateData.id; // Usually ID is immutable in path
            await updateDoc(doc(window.firebaseDB, path), updateData);
        } catch (e) {
            this.handleError(e, 'update', path);
        }
    },

    async getAllLots() {
        const { collection, getDocs, query, orderBy } = window.FirebaseSDK.firestore;
        const path = 'lots';
        try {
            const q = query(collection(window.firebaseDB, path), orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                if (data.timestamp && data.timestamp.toDate) data.timestamp = data.timestamp.toDate();
                return data;
            });
        } catch (e) {
            this.handleError(e, 'list', path);
        }
    },

    async getLotsByFarmer(farmerId) {
        const { collection, getDocs, query, where } = window.FirebaseSDK.firestore;
        const path = 'lots';
        try {
            const q = query(collection(window.firebaseDB, path), where('farmerId', '==', farmerId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                if (data.timestamp && data.timestamp.toDate) data.timestamp = data.timestamp.toDate();
                return data;
            }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (e) {
            this.handleError(e, 'list', path);
        }
    },

    async addTransfer(transfer) {
        const { collection, addDoc, serverTimestamp } = window.FirebaseSDK.firestore;
        const path = `lots/${transfer.lotId}/transfers`;
        try {
            await addDoc(collection(window.firebaseDB, path), {
                ...transfer,
                timestamp: serverTimestamp()
            });
        } catch (e) {
            this.handleError(e, 'write', path);
        }
    },

    async getTransfersByLot(lotId) {
        const { collection, getDocs, query, orderBy } = window.FirebaseSDK.firestore;
        const path = `lots/${lotId}/transfers`;
        try {
            const q = query(collection(window.firebaseDB, path), orderBy('timestamp', 'asc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                if (data.timestamp && data.timestamp.toDate) data.timestamp = data.timestamp.toDate();
                return data;
            });
        } catch (e) {
            this.handleError(e, 'list', path);
        }
    },

    async getCooperatives() {
        const { collection, getDocs, query, where } = window.FirebaseSDK.firestore;
        const path = 'users';
        try {
            const q = query(collection(window.firebaseDB, path), where('role', '==', 'COOP'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data());
        } catch (e) {
            this.handleError(e, 'list', path);
        }
    },

    async getCooperativesByLocality(locality) {
        const { collection, getDocs, query, where } = window.FirebaseSDK.firestore;
        const path = 'users';
        try {
            const q = query(
                collection(window.firebaseDB, path),
                where('role', '==', 'COOP'),
                where('locality', '==', locality)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data());
        } catch (e) {
            this.handleError(e, 'list', path);
        }
    },

    async urgentTransfer({ lotId, targetCoopId, actorId, note }) {
        const { doc, updateDoc } = window.FirebaseSDK.firestore;
        const lotPath = `lots/${lotId}`;
        try {
            const updateData = { coopId: targetCoopId };
            await updateDoc(doc(window.firebaseDB, lotPath), updateData);

            await this.addTransfer({
                lotId,
                actorId: actorId || 'UNKNOWN',
                type: 'URGENT_TRANSFER',
                timestamp: new Date(),
                data: { note, targetCoopId }
            });
        } catch (e) {
            this.handleError(e, 'update', lotPath);
        }
    }
};

// Expose database globally for other scripts and inline handlers
try { window.database = database; } catch (e) { /* ignore when not in browser */ }
