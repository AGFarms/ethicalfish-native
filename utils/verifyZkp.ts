import snarkjs from 'snarkjs';
import { CurveType, Library, zkVerifySession } from 'zkverifyjs';

export const verifyZkp = async (proof: any) => {
  try {
    // Initialize zkVerify session with your account (use your actual seed phrase)
    const session = await zkVerifySession.start().Testnet().withAccount(process.env.SEEDPHRASE!);

    // Verify the proof using the public signals
    const { events, transactionResult } = await session.verify()
      .groth16(Library.snarkjs, CurveType.bn254)
        .execute({
          proofData: {
            vk: 'geofence_verification_key',
            proof: proof.proof,
            publicSignals: proof.publicSignals
          }
        });
      

    // Wait for transaction result
    const transactionInfo = await transactionResult;
    return transactionInfo;
  } catch (error: any) {
    console.error('ZKP Verification failed:', error);
    throw new Error('ZKP Verification failed: ' + error.message);
  }
};