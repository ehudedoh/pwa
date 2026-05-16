const CONTRACT_ABI = (typeof window !== 'undefined' && window.CHAINCACAO_ABI) ? window.CHAINCACAO_ABI : [
    'function anchorData(string batchId, string dataHash, string actorId) public'
];

const blockchain = {
    get runtimeConfig() {
        return window.__CHAINCACAO_CONFIG__ || {};
    },

    get contractAddress() {
        return this.runtimeConfig.contractAddress || window.APP_CONFIG?.contractAddress || '0xF7d808899F7D529c5f2A2F4637726Bb25B4a26a7';
    },

    get chainId() {
        return Number(this.runtimeConfig.chainId || window.APP_CONFIG?.chainId || 137);
    },

    // async simulateHash(data) {
    //     const str = JSON.stringify(data);
    //     const encoder = new TextEncoder();
    //     const msgUint8 = encoder.encode(str);
    //     const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    //     const hashArray = Array.from(new Uint8Array(hashBuffer));
    //     return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    // },

    async simulateHash(data) {
        const str = JSON.stringify(data);
        // Solution de fallback : utiliser une fonction de hashage manuelle
        // si crypto.subtle n'est pas disponible
        if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
            try {
                const encoder = new TextEncoder();
                const msgUint8 = encoder.encode(str);
                const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (e) {
                console.warn('crypto.subtle.digest a echoue, utilisation du fallback');
            }
        }
        // Fallback : hashage simple mais fonctionnel
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        // Generer un hash de 64 caracteres hex
        const hashPart = Math.abs(hash).toString(16).padStart(16, '0');
        const timestamp = Date.now().toString(16).padStart(16, '0');
        const random = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
        return '0x' + hashPart + timestamp + random + '0'.repeat(24);
    },

    resolveBatchId(data, actorId) {
        if (data && typeof data === 'object') {
            return data.batchId || data.containerId || data.lotId || data.id || actorId || 'CHAINCACAO';
        }
        return actorId || 'CHAINCACAO';
    },

    async sendWithMetaMask(data, actorId) {
        if (!window.ethereum || !window.ethers) {
            throw new Error('MetaMask ou ethers non disponible');
        }

        const provider = new window.ethers.BrowserProvider(window.ethereum);
        await provider.send('eth_requestAccounts', []);

        const network = await provider.getNetwork();
        if (Number(network.chainId) !== this.chainId) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${this.chainId.toString(16)}` }]
                });
            } catch (switchError) {
                throw new Error('Veuillez passer sur Polygon Mainnet dans MetaMask');
            }
        }

        const signer = await provider.getSigner();
        // const contract = new window.ethers.Contract(this.contractAddress, CONTRACT_ABI, signer);
        // const batchId = this.resolveBatchId(data, actorId);
        // const dataHash = await this.simulateHash(data);

        // Verifier que le contrat est accessible
        if (!this.contractAddress || this.contractAddress === '0x0000000000000000000000000000000000000000') {
            throw new Error('Adresse du contrat non configuree');
        }

        // Verifier que le signer est valide
        if (!signer) {
            throw new Error('Impossible d obtenir le signer MetaMask');
        }

        const contract = new window.ethers.Contract(this.contractAddress, CONTRACT_ABI, signer);
        const batchId = this.resolveBatchId(data, actorId);
        const dataHash = await this.simulateHash(data);

        const tx = await contract.anchorData(batchId, dataHash, actorId);
        const receipt = await tx.wait();

        return {
            hash: tx.hash,
            actorId,
            batchId,
            dataHash,
            network: window.APP_CONFIG?.networkName || 'Polygon Mainnet',
            blockNumber: receipt?.blockNumber || null,
            timestamp: new Date(),
            explorerUrl: `https://polygonscan.com/tx/${tx.hash}`
        };
    },

    async submitTransaction(data, actorId) {
        try {
            return await this.sendWithMetaMask(data, actorId);
        } catch (error) {
            const relayerUrl =
                this.runtimeConfig.relayerUrl ||
                window.APP_CONFIG?.relayerUrl ||
                'https://pwa-production-d9cd.up.railway.app/api/anchor';
            if (relayerUrl) {
                try {
                    return await this.sendViaRelayer(data, actorId);
                } catch (rErr) {
                    throw new Error(`Transaction blockchain impossible (MetaMask et relayer ont échoué): ${error.message}; relayer: ${rErr.message}`);
                }
            }
            throw new Error(`Transaction blockchain impossible: ${error.message || error}`);
        }
    },

    async sendViaRelayer(data, actorId) {
        const relayerUrl =
            this.runtimeConfig.relayerUrl ||
            window.APP_CONFIG?.relayerUrl ||
            'https://pwa-production-d9cd.up.railway.app/api/anchor';
        if (!relayerUrl) throw new Error('Relayer non configuré');

        // Utiliser /api/anchor comme endpoint par defaut
        let url = relayerUrl;
        if (!url.includes('/api/anchor')) {
            url = url.replace(/\/$/, '') + '/api/anchor';
        }
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, actorId })
        });

        if (!res.ok) {
            let errBody = null;
            try { errBody = await res.json(); } catch (e) { /* ignore */ }
            throw new Error(errBody?.error || `Relayer error ${res.status}`);
        }

        const json = await res.json();
        return {
            hash: json.hash,
            actorId,
            batchId: this.resolveBatchId(data, actorId),
            dataHash: json.dataHash || await this.simulateHash(data),
            network: window.APP_CONFIG?.networkName || 'Polygon Mainnet',
            blockNumber: json.blockNumber || null,
            timestamp: new Date(),
            explorerUrl: json.explorerUrl || (`https://polygonscan.com/tx/${json.hash}`)
        };
    },

    async notarize(data, actorId) {
        return this.submitTransaction(data, actorId);
    }
};
