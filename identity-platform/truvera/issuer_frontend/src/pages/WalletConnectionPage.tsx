import MetaMaskConnection from '../components/MetaMaskConnection';

export default function WalletConnectionPage() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 lg:p-8">
      <MetaMaskConnection />
    </div>
  );
}