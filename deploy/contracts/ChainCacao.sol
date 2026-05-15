// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ChainCacao
 * @dev Contrat de traçabilité immuable pour la filière cacao sur Polygon.
 * Permet d'ancrer les empreintes numériques (hashs) des étapes de production.
 */
contract ChainCacao {
    
    struct TraceabilityNode {
        string dataHash;      // Le hash SHA-256 des données du lot
        string actorId;       // L'identifiant de l'acteur (ID Firebase)
        uint256 timestamp;    // Moment de l'enregistrement
        uint256 blockNumber;  // Numéro du bloc pour audit
        address reporter;     // Adresse wallet qui a soumis l'info
    }

    // Mapping: ID du lot (Slug/ID) => Liste des étapes de traçabilité
    mapping(string => TraceabilityNode[]) private _batchHistory;
    
    // Mapping pour vérifier si un hash précis a déjà été ancré (anti-doublon)
    mapping(string => bool) private _certifiedHashes;

    event DataAnchored(string indexed batchId, string dataHash, string actorId, address reporter);

    /**
     * @dev Enregistre une nouvelle étape de traçabilité pour un lot.
     * @param batchId L'identifiant unique du lot de cacao.
     * @param dataHash Le hash calculé côté client représentant les données de l'étape.
     * @param actorId L'identifiant de l'acteur (ex: AGR-123).
     */
    function anchorData(string memory batchId, string memory dataHash, string memory actorId) public {
        require(bytes(batchId).length > 0, "ID du lot requis");
        require(bytes(dataHash).length > 0, "Hash requis");

        TraceabilityNode memory newNode = TraceabilityNode({
            dataHash: dataHash,
            actorId: actorId,
            timestamp: block.timestamp,
            blockNumber: block.number,
            reporter: msg.sender
        });

        _batchHistory[batchId].push(newNode);
        _certifiedHashes[dataHash] = true;

        emit DataAnchored(batchId, dataHash, actorId, msg.sender);
    }

    /**
     * @dev Récupère l'historique complet d'un lot.
     */
    function getBatchHistory(string memory batchId) public view returns (TraceabilityNode[] memory) {
        return _batchHistory[batchId];
    }

    /**
     * @dev Vérifie si une empreinte (hash) de données est authentifiée sur la blockchain.
     */
    function isHashCertified(string memory dataHash) public view returns (bool) {
        return _certifiedHashes[dataHash];
    }
}
