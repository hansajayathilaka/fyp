import deploymentInfo from '../../../deployment-info.json'

// Contract addresses from deployment
export const CONTRACT_ADDRESSES = {
  REGULATORY_MANAGEMENT: deploymentInfo.regulatoryManagement as `0x${string}`,
  REGULATED_ERC1155_TOKEN: deploymentInfo.regulatedERC1155Token as `0x${string}`,
  REGULATED_MARKETPLACE: deploymentInfo.regulatedMarketplace as `0x${string}`,
} as const

// Network configuration
export const DEPLOYMENT_INFO = {
  network: deploymentInfo.network,
  chainId: deploymentInfo.chainId,
  deployer: deploymentInfo.deployer as `0x${string}`,
  deploymentTime: deploymentInfo.deploymentTime,
} as const

// Helper function to get contract address by name
export function getContractAddress(contractName: keyof typeof CONTRACT_ADDRESSES): `0x${string}` {
  return CONTRACT_ADDRESSES[contractName]
}

// Validate that all required addresses are present
export function validateContractAddresses(): boolean {
  return Object.values(CONTRACT_ADDRESSES).every(address => 
    address && address.length === 42 && address.startsWith('0x')
  )
}