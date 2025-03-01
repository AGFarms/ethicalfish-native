const walrusPublisherUrls = [
    "https://publisher.walrus-testnet.walrus.space/v1/store",
    "https://wal-publisher-testnet.staketab.org/v1/store",
    "https://walrus-testnet-publisher.redundex.com/v1/store",
    "https://walrus-testnet-publisher.nodes.guru/v1/store", 
    "https://walrus-testnet-publisher.stakin-nodes.com/v1/store",
    "https://testnet-publisher-walrus.kiliglab.io/v1/store",
    "https://walrus-testnet-publisher.nodeinfra.com/v1/store",
    "https://walrus-publisher.rubynodes.io/v1/store",
    "https://walrus-testnet-publisher.brightlystake.com/v1/store",
    "https://walrus-testnet-publisher.nami.cloud/v1/store",
    "https://publisher.testnet.walrus.mirai.cloud/v1/store",
    "https://walrus-testnet-publisher.stakecraft.com/v1/store",
    "https://pub.test.walrus.eosusa.io/v1/store",
    "https://walrus-pub.testnet.obelisk.sh/v1/store",
    "https://walrus-testnet-publisher.stakingdefenseleague.com/v1/store",
    "https://walrus-testnet.thepassivetrust.com/v1/store",
    "https://walrus-testnet-publisher.natsai.xyz/v1/store",
    "https://walrus.testnet.publisher.stakepool.dev.br/v1/store",
    "https://publisher.walrus.banansen.dev/v1/store",
    "https://testnet.publisher.walrus.silentvalidator.com/v1/store",
    "https://testnet-publisher.walrus.graphyte.dev/v1/store",
    "https://walrus-testnet-publisher.imperator.co/v1/store",
    "https://walrus-testnet-publisher.unemployedstake.co.uk/v1/store",
    "https://publisher.walrus-01.tududes.com/v1/store",
    "https://walrus-publisher-testnet.n1stake.com/v1/store",
    "https://suiftly-testnet-pub.mhax.io/v1/store",
    "https://walrus-testnet-publisher.trusted-point.com/v1/store",
    "https://walrus-testnet-publisher.veera.com/v1/store",
    "https://publisher.testnet.walrus.atalma.io/v1/store",
    "https://153-gb3-val-walrus-publisher.stakesquid.com/v1/store",
    "https://sui-walrus-testnet.bwarelabs.com/publisher/v1/store",
    "https://walrus-testnet.chainbase.online/publisher/v1/store",
    "https://walrus-testnet.blockscope.net:11444/v1/store",
    "https://walrus-publish-testnet.chainode.tech:9003/v1/store",
    "https://walrus-testnet-publisher.starduststaking.com/v1/store",
    "http://walrus-publisher-testnet.overclock.run:9001/v1/store",
    "https://walrus-testnet-publisher.everstake.one/v1/store",
    "http://walrus.testnet.pops.one:9001/v1/store",
    "http://ivory-dakar-e5812.walrus.bdnodes.net:9001/v1/store",
    "http://publisher.testnet.sui.rpcpool.com:9001/v1/store",
    "http://walrus.krates.ai:9001/v1/store",
    "http://walrus-publisher-testnet.latitude-sui.com:9001/v1/store",
    "http://walrus-tn.juicystake.io:9090/v1/store",
    "http://walrus.globalstake.io:9001/v1/store",
    "http://walrus-testnet.staking4all.org:9001/v1/store",
    "http://walrus-testnet.rpc101.org:9001/v1/store",
    "http://walrus-publisher-testnet.cetus.zone:9001/v1/store",
    "http://93.115.27.108:9001/v1/store",
    "http://65.21.139.112:9001/v1/store",
    "http://162.19.18.19:9001/v1/store",
    "http://walrus-publisher.stakeme.pro:9001/v1/store",
    "http://walrus-storage.testnet.nelrann.org:9001/v1/store",
    "http://walrus-testnet.senseinode.com:9001/v1/store",
    "http://walrus-testnet.equinoxdao.xyz:9001/v1/store",
    "https://walrus-testnet-publisher.stakely.io/v1/store",
    "https://walrus-testnet-publisher.criterionvc.com/v1/store",
    "http://37.27.230.228:9001/v1/store",
    "https://walrus-testnet-published.luckyresearch.org/v1/store",
    "http://walrus-testnet.suicore.com:9001/v1/store",
    "https://walrus-testnet.validators.services.kyve.network/publish/v1/store",
    "http://walrus-publisher-testnet.suisec.tech:9001/v1/store"
];
  
  // Function to upload a file to Walrus
  export const uploadFileToWalrus = async (file: File): Promise<any> => {
    for (const url of walrusPublisherUrls) {
      try {
        const response = await fetch(`${url}/blobs?epochs=5`, {
          method: 'PUT',
          body: file,
        });
  
        if (!response.ok) {
          const errorMessage = await response.text();
          console.error(`Failed to upload file to ${url}: ${response.statusText} - ${errorMessage}`);
          continue; // Try the next URL
        }
  
        const data = await response.json();
        console.log(`File uploaded successfully to ${url}:`, data);
        return data; // Return after successful upload
      } catch (error) {
        console.error(`Error uploading file to ${url}:`, error);
      }
    }
    throw new Error('All upload attempts failed.');
  };
  
  // Function to upload JSON metadata to Walrus
  export const uploadJSONToWalrus = async (jsonmetadata: Record<string, any>): Promise<any> => {
    for (const url of walrusPublisherUrls) {
      try {
        const response = await fetch(`${url}/blobs?epochs=5`, {
          method: 'PUT',
          body: JSON.stringify(jsonmetadata),
          headers: {
            'Content-Type': 'application/json',
          },
        });
  
        if (!response.ok) {
          const errorMessage = await response.text();
          console.error(`Failed to upload JSON metadata to ${url}: ${response.statusText} - ${errorMessage}`);
          continue; // Try the next URL
        }
  
        const data = await response.json();
        console.log(`JSON metadata uploaded successfully to ${url}:`, data);
        return data; // Return after successful upload
      } catch (error) {
        console.error(`Error uploading JSON metadata to ${url}:`, error);
      }
    }
    throw new Error('All upload attempts failed.');
  };
  