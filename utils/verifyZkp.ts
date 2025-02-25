import { zkVerifySession } from 'zkverifyjs';

export const verifyZkp = async (proof: any) => {
  try {
    // Initialize zkVerify session with your account (use your actual seed phrase)
    const session = await zkVerifySession.start().Testnet().withAccount('xpjk4zBVPaWFKXArnCZjuiLVvatqav4suRqsXh1k21jKi2UnQ');

    // Verify the proof using the public signals
    const { events, transactionResult } = await session.verify()
      .risc0()
      .execute({
        proofData: {
          vk: 'geofence_verification_key',  // Replace with actual verification key
          proof: proof.proof,
          publicSignals: proof.publicSignals,
        },
      });

    // Wait for transaction result
    const transactionInfo = await transactionResult;
    return transactionInfo;
  } catch (error: any) {
    console.error('ZKP Verification failed:', error);
    throw new Error('ZKP Verification failed: ' + error.message);
  }
};
