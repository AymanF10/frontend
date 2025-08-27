'use client'

import { BN } from '@coral-xyz/anchor'
import { getHybridAmmProgram, getHybridAmmProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, PublicKey, SystemProgram, Keypair, Transaction } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createInitializeMint2Instruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from '@solana/spl-token'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { atom, useAtom } from 'jotai'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'

export function useHybridAmmProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getHybridAmmProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getHybridAmmProgram(provider, programId), [provider, programId])

  const getProgramAccount = useQuery({
    queryKey: ['hybrid-amm', 'program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  return {
    program,
    programId,
    getProgramAccount,
  }
}

export function useHybridAmmConfig({ config }: { config: PublicKey | null }) {
  const { cluster } = useCluster()
  const { program } = useHybridAmmProgram()

  const configAccount = useQuery({
    queryKey: ['hybrid-amm', 'config', { cluster, config }],
    queryFn: () => program.account.config.fetch(config!),
    enabled: !!config,
  })

  return {
    configAccount,
  }
}

export async function deriveAddresses(params: {
  programId: PublicKey
  config: PublicKey
  mintX: PublicKey
  mintY: PublicKey
  user: PublicKey
}) {
  const mintLp = PublicKey.findProgramAddressSync([Buffer.from('lp'), params.config.toBuffer()], params.programId)[0]
  const vaultX = await getAssociatedTokenAddress(params.mintX, params.config, true)
  const vaultY = await getAssociatedTokenAddress(params.mintY, params.config, true)
  const userX = await getAssociatedTokenAddress(params.mintX, params.user, false)
  const userY = await getAssociatedTokenAddress(params.mintY, params.user, false)
  const userLp = await getAssociatedTokenAddress(mintLp, params.user, false)

  return { mintLp, vaultX, vaultY, userX, userY, userLp }
}

export function deriveConfigPda(programId: PublicKey, seed: bigint | number | BN) {
  const bn = seed instanceof BN ? seed : new BN(seed)
  const seedLe = bn.toArrayLike(Buffer, 'le', 8)
  return PublicKey.findProgramAddressSync([Buffer.from('config'), seedLe], programId)[0]
}

export function useHybridAmmMutations() {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program } = useHybridAmmProgram()
  // wallet not needed here; callers pass public keys

  const initialize = useMutation({
    mutationKey: ['hybrid-amm', 'initialize', { cluster }],
    mutationFn: async (args: {
      seed: bigint | number | BN
      fee: number
      authority: PublicKey | null
      admin: PublicKey
      mintX: PublicKey
      mintY: PublicKey
      config: PublicKey
      mintLp: PublicKey
      vaultX: PublicKey
      vaultY: PublicKey
    }) =>
      program.methods
        .initialize(
          args.seed instanceof BN ? args.seed : new BN(args.seed),
          args.fee,
          args.authority,
        )
        .accountsStrict({
          admin: args.admin,
          mintX: args.mintX,
          mintY: args.mintY,
          mintLp: args.mintLp,
          vaultX: args.vaultX,
          vaultY: args.vaultY,
          config: args.config,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc(),
    onSuccess: (sig) => transactionToast(sig),
    onError: (err) => {
      console.error('initialize error', err)
      toast.error('Failed to initialize')
    },
  })

  const deposit = useMutation({
    mutationKey: ['hybrid-amm', 'deposit', { cluster }],
    mutationFn: async (args: {
      user: PublicKey
      mintX: PublicKey
      mintY: PublicKey
      config: PublicKey
      mintLp: PublicKey
      vaultX: PublicKey
      vaultY: PublicKey
      userX: PublicKey
      userY: PublicKey
      userLp: PublicKey
      amount: bigint | number | BN
      maxX: bigint | number | BN
      maxY: bigint | number | BN
    }) =>
      program.methods
        .deposit(
          args.amount instanceof BN ? args.amount : new BN(args.amount),
          args.maxX instanceof BN ? args.maxX : new BN(args.maxX),
          args.maxY instanceof BN ? args.maxY : new BN(args.maxY),
        )
        .accountsStrict({
          user: args.user,
          mintX: args.mintX,
          mintY: args.mintY,
          config: args.config,
          mintLp: args.mintLp,
          vaultX: args.vaultX,
          vaultY: args.vaultY,
          userX: args.userX,
          userY: args.userY,
          userLp: args.userLp,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc(),
    onSuccess: (sig) => transactionToast(sig),
    onError: (err) => {
      console.error('deposit error', err)
      toast.error('Failed to deposit')
    },
  })

  const swap = useMutation({
    mutationKey: ['hybrid-amm', 'swap', { cluster }],
    mutationFn: async (args: {
      user: PublicKey
      mintX: PublicKey
      mintY: PublicKey
      config: PublicKey
      mintLp: PublicKey
      vaultX: PublicKey
      vaultY: PublicKey
      userX: PublicKey
      userY: PublicKey
      isX: boolean
      amount: bigint | number | BN
      min: bigint | number | BN
    }) =>
      program.methods
        .swap(
          args.isX,
          args.amount instanceof BN ? args.amount : new BN(args.amount),
          args.min instanceof BN ? args.min : new BN(args.min),
        )
        .accountsStrict({
          user: args.user,
          mintX: args.mintX,
          mintY: args.mintY,
          config: args.config,
          mintLp: args.mintLp,
          vaultX: args.vaultX,
          vaultY: args.vaultY,
          userX: args.userX,
          userY: args.userY,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc(),
    onSuccess: (sig) => transactionToast(sig),
    onError: (err) => {
      console.error('swap error', err)
      toast.error('Failed to swap')
    },
  })

  const withdraw = useMutation({
    mutationKey: ['hybrid-amm', 'withdraw', { cluster }],
    mutationFn: async (args: {
      user: PublicKey
      mintX: PublicKey
      mintY: PublicKey
      config: PublicKey
      mintLp: PublicKey
      vaultX: PublicKey
      vaultY: PublicKey
      userX: PublicKey
      userY: PublicKey
      userLp: PublicKey
      amount: bigint | number | BN
      minX: bigint | number | BN
      minY: bigint | number | BN
    }) =>
      program.methods
        .withdraw(
          args.amount instanceof BN ? args.amount : new BN(args.amount),
          args.minX instanceof BN ? args.minX : new BN(args.minX),
          args.minY instanceof BN ? args.minY : new BN(args.minY),
        )
        .accountsStrict({
          user: args.user,
          mintX: args.mintX,
          mintY: args.mintY,
          config: args.config,
          mintLp: args.mintLp,
          vaultX: args.vaultX,
          vaultY: args.vaultY,
          userX: args.userX,
          userY: args.userY,
          userLp: args.userLp,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc(),
    onSuccess: (sig) => transactionToast(sig),
    onError: (err) => {
      console.error('withdraw error', err)
      toast.error('Failed to withdraw')
    },
  })

  const lock = useMutation({
    mutationKey: ['hybrid-amm', 'lock', { cluster }],
    mutationFn: async (args: { user: PublicKey; config: PublicKey }) =>
      program.methods.lock().accountsStrict({ user: args.user, config: args.config }).rpc(),
    onSuccess: (sig) => transactionToast(sig),
    onError: (err) => {
      console.error('lock error', err)
      toast.error('Failed to lock')
    },
  })

  const unlock = useMutation({
    mutationKey: ['hybrid-amm', 'unlock', { cluster }],
    mutationFn: async (args: { user: PublicKey; config: PublicKey }) =>
      program.methods.unlock().accountsStrict({ user: args.user, config: args.config }).rpc(),
    onSuccess: (sig) => transactionToast(sig),
    onError: (err) => {
      console.error('unlock error', err)
      toast.error('Failed to unlock')
    },
  })

  return { initialize, deposit, swap, withdraw, lock, unlock }
}

export function useHybridAmmSetup() {
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const { connection } = useConnection()

  const generateMints = useMutation({
    mutationKey: ['hybrid-amm', 'generate-mints'],
    mutationFn: async (decimals: number = 6) => {
      if (!provider.wallet.publicKey) throw new Error('Wallet not connected')
      const payer = provider.wallet.publicKey

      // Create both mints in a single transaction
      const mintX = Keypair.generate()
      const mintY = Keypair.generate()
      const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE)
      const tx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: mintX.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMint2Instruction(mintX.publicKey, decimals, payer, payer, TOKEN_PROGRAM_ID),
        SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: mintY.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMint2Instruction(mintY.publicKey, decimals, payer, payer, TOKEN_PROGRAM_ID),
      )
      const { blockhash } = await connection.getLatestBlockhash()
      tx.feePayer = payer
      tx.recentBlockhash = blockhash
      await provider.sendAndConfirm(tx, [mintX, mintY], { commitment: 'confirmed' })
      return { mintX: mintX.publicKey, mintY: mintY.publicKey }
    },
    onSuccess: () => {},
    onError: (err) => {
      console.error('generateMints error', err)
      toast.error('Failed to generate mints')
    },
  })

  const mintToWallet = useMutation({
    mutationKey: ['hybrid-amm', 'mint-to-wallet'],
    mutationFn: async (args: { mint: PublicKey; amount: bigint | number }) => {
      if (!provider.wallet.publicKey) throw new Error('Wallet not connected')
      const owner = provider.wallet.publicKey
      const ata = await getAssociatedTokenAddress(args.mint, owner, false)
      const ixCreateAta = createAssociatedTokenAccountInstruction(
        owner,
        ata,
        owner,
        args.mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )
      const ixMint = createMintToInstruction(args.mint, ata, owner, BigInt(args.amount))
      const tx = new Transaction().add(ixCreateAta, ixMint)
      const { blockhash } = await connection.getLatestBlockhash()
      tx.feePayer = owner
      tx.recentBlockhash = blockhash
      const sig = await provider.sendAndConfirm(tx, [], { commitment: 'confirmed' })
      transactionToast(sig)
      return { ata }
    },
    onError: (err) => {
      console.error('mintToWallet error', err)
      toast.error('Failed to mint tokens')
    },
  })

  const mintBothToWallet = useMutation({
    mutationKey: ['hybrid-amm', 'mint-both-to-wallet'],
    mutationFn: async (args: { mintX: PublicKey; mintY: PublicKey; amountX: bigint | number; amountY: bigint | number }) => {
      if (!provider.wallet.publicKey) throw new Error('Wallet not connected')
      const owner = provider.wallet.publicKey
      const ataX = await getAssociatedTokenAddress(args.mintX, owner, false)
      const ataY = await getAssociatedTokenAddress(args.mintY, owner, false)

      const [infoX, infoY] = await Promise.all([
        connection.getAccountInfo(ataX),
        connection.getAccountInfo(ataY),
      ])

      const tx = new Transaction()
      if (!infoX) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            owner,
            ataX,
            owner,
            args.mintX,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          ),
        )
      }
      if (!infoY) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            owner,
            ataY,
            owner,
            args.mintY,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          ),
        )
      }

      tx.add(
        createMintToInstruction(args.mintX, ataX, owner, BigInt(args.amountX)),
        createMintToInstruction(args.mintY, ataY, owner, BigInt(args.amountY)),
      )

      const { blockhash } = await connection.getLatestBlockhash()
      tx.feePayer = owner
      tx.recentBlockhash = blockhash
      const sig = await provider.sendAndConfirm(tx, [], { commitment: 'confirmed' })
      transactionToast(sig)
      return { ataX, ataY }
    },
    onError: (err) => {
      console.error('mintBothToWallet error', err)
      toast.error('Failed to mint tokens to wallet')
    },
  })

  return { generateMints, mintToWallet, mintBothToWallet }
}

// In-memory state to hard-code config and mints after initialize
type HybridAmmState = {
  config?: string
  mintX?: string
  mintY?: string
  mintLp?: string
}

const hybridAmmStateAtom = atom<HybridAmmState>({})

export function useHybridAmmState() {
  const [state, setState] = useAtom(hybridAmmStateAtom)
  return { state, setState }
}


