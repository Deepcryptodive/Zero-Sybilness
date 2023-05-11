import { useEffect, useState } from "react";
import {
  switchNetwork,
  mumbaiFork,
  requestAccounts,
  getPublicClient,
  handleVerifyErrors,
  callContract,
  signMessage,
} from "@/utils";
import { abi as AirdropABI } from "../../../abi/Airdrop.json";
import { transactions } from "../../../broadcast/Airdrop.s.sol/5151110/run-latest.json";
import {
  encodeAbiParameters,
  createWalletClient,
  http,
  custom,
  WalletClient,
  PublicClient,
} from "viem";
import { polygonMumbai } from "viem/chains";
import BackButton from "../components/BackButton";
import {
  SismoConnectButton,
  SismoConnectClientConfig,
  AuthType,
} from "@sismo-core/sismo-connect-react";
import { devGroups } from "../config";

// The application calls contracts on Mumbai testnet
const userChain = mumbaiFork;
const contractAddress = transactions[0].contractAddress;

// with your Sismo Connect app ID and enable dev mode.
// you can create a new Sismo Connect app at https://factory.sismo.io
// The SismoConnectClientConfig is a configuration needed to connect to Sismo Connect and requests data from your users.
// You can find more information about the configuration here: https://docs.sismo.io/build-with-sismo-connect/technical-documentation/sismo-connect-react

export const sismoConnectConfig: SismoConnectClientConfig = {
  appId: "0xf4977993e52606cfd67b7a1cde717069",
  devMode: {
    enabled: true,
  },
};

export default function ClaimAirdrop() {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string>("");
  const [tokenId, setTokenId] = useState<{ id: string }>();
  const [account, setAccount] = useState<`0x${string}`>(
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  );
  const [isAirdropAddressKnown, setIsAirdropAddressKnown] = useState<boolean>(false);
  const [walletClient, setWalletClient] = useState<WalletClient>(
    createWalletClient({
      chain: userChain,
      transport: http(),
    }) as WalletClient
  );
  const publicClient: PublicClient = getPublicClient(userChain);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setWalletClient(
      createWalletClient({
        chain: userChain,
        transport: custom(window.ethereum, {
          key: "windowProvider",
        }),
      }) as WalletClient
    );

    setIsAirdropAddressKnown(localStorage.getItem("airdropAddress") ? true : false);
    if (isAirdropAddressKnown) {
      setAccount(localStorage.getItem("airdropAddress") as `0x${string}`);
    }
  }, [isAirdropAddressKnown]);

  async function connectWallet() {
    const address = await requestAccounts();
    localStorage.setItem("airdropAddress", address);
    setAccount(address);
    setIsAirdropAddressKnown(true);
  }

  // This function is called when the user is redirected from the Sismo Vault to the Sismo Connect app
  // It is called with the responseBytes returned by the Sismo Vault
  // The responseBytes is a string that contains plenty of information about the user proofs and additional parameters that should hold with respect to the proofs
  // You can learn more about the responseBytes format here: https://docs.sismo.io/build-with-sismo-connect/technical-documentation/sismo-connect-client#getresponsebytes
  async function verify(responseBytes: string) {
    // update the react state to show the loading state
    setVerifying(true);
    // switch the network
    await switchNetwork(userChain);
    try {
      const tokenId = await callContract({
        contractAddress,
        responseBytes,
        userChain,
        account,
        publicClient,
        walletClient,
      });
      // If the proof is valid, we update the user react state to show the tokenId
      setTokenId({ id: tokenId });
    } catch (e) {
      setError(handleVerifyErrors(e));
    } finally {
      setVerifying(false);
      localStorage.removeItem("airdropAddress");
    }
  }

  return (
    <>
      <BackButton />
      <div className="container">
        {!tokenId && (
          <>
            <h1 style={{ marginBottom: 10 }}>Claim an airdrop</h1>
            {!isAirdropAddressKnown && (
              // <p style={{ marginBottom: 40 }}>
              //   Select on which address you want to receive the airdrop and sign it with Sismo
              //   Connect
              // </p>
              <p style={{ marginBottom: 40 }}>
                Select on which address you want to receive the airdrop by connecting your wallet
              </p>
            )}

            {isAirdropAddressKnown ? (
              <p style={{ marginBottom: 40 }}>You are connected with the address {account}</p>
            ) : (
              !error && (
                <button className="connect-wallet-button" onClick={() => connectWallet()}>
                  Connect Wallet
                </button>
              )
            )}

            {
              // This is the Sismo Connect button that will be used to create the requests and redirect the user to the Sismo Vault app to generate the proofs from his data
              // The different props are:
              // - config: the Sismo Connect client config that contains the Sismo Connect appId
              // - auths: the auth requests that will be used to generate the proofs, here we only use the Vault auth request
              // - signature: the signature request that will be used to sign an arbitrary message that will be checked onchain, here it is used to sign the airdrop address
              // - onResponseBytes: the callback that will be called when the user is redirected back from the his Sismo Vault to the Sismo Connect App with the Sismo Connect response as bytes
              // - verifying: a boolean that indicates if the Sismo Connect button is in the verifying state
              // - callbackPath: the path to which the user will be redirected back from the Sismo Vault to the Sismo Connect App
              // You can see more information about the Sismo Connect button in the Sismo Connect documentation: https://docs.sismo.io/build-with-sismo-connect/technical-documentation/sismo-connect-react
            }
            {!error && isAirdropAddressKnown && (
              <SismoConnectButton
                // the client config created
                config={sismoConnectConfig}
                // the auth request we want to make
                // here we want the proof of a Sismo Vault ownership from our users
                auths={[{ authType: AuthType.VAULT }]}
                // we use the AbiCoder to encode the data we want to sign
                // by encoding it we will be able to decode it on chain
                signature={{ message: signMessage(account) }}
                // onResponseBytes calls a 'verify' function where the contract call logic
                // is implemented
                onResponseBytes={(responseBytes: string) => verify(responseBytes)}
                // a simple state to know if the button is in verifying state
                // i.e calling the smart contract
                verifying={verifying}
                // the callback path where you want to redirect your users from the Sismo Vault app
                // here we choose this same page
                callbackPath={"/claim-airdrop"}
              />
            )}
          </>
        )}

        {tokenId && (
          <>
            <h1>Airdrop claimed!</h1>
            <p style={{ marginBottom: 20 }}>
              The user has chosen an address to receive the airdrop
            </p>
            <div className="profile-container">
              <div>
                <h2>NFT Claimed</h2>
                <b>tokenId: {tokenId?.id}</b>
                <p>Address used: {account}</p>
              </div>
            </div>
          </>
        )}

        {error && (
          <>
            <h2>{error}</h2>
          </>
        )}
      </div>
    </>
  );
}
