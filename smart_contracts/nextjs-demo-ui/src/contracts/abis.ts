// Contract ABIs imported directly from hardhat artifacts
import RegulatoryManagementArtifact from '../../../artifacts/contracts/RegulatoryManagement.sol/RegulatoryManagement.json';
import RegulatedERC1155TokenArtifact from '../../../artifacts/contracts/RegulatedERC1155Token.sol/RegulatedERC1155Token.json';
import RegulatedMarketplaceArtifact from '../../../artifacts/contracts/RegulatedMarketplace.sol/RegulatedMarketplace.json';

export const CONTRACT_ABIS = {
  REGULATORY_MANAGEMENT: RegulatoryManagementArtifact.abi,
  REGULATED_ERC1155_TOKEN: RegulatedERC1155TokenArtifact.abi,
  REGULATED_MARKETPLACE: RegulatedMarketplaceArtifact.abi,
} as const;

// Helper function to get ABI by contract name
export function getContractABI(contractName: keyof typeof CONTRACT_ABIS) {
  return CONTRACT_ABIS[contractName];
}

// Type definitions for better TypeScript support
export type ContractName = keyof typeof CONTRACT_ABIS;
export type ContractABI = typeof CONTRACT_ABIS[ContractName];
