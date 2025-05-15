"use client"

import { useState, useEffect, useCallback } from "react"
import { BrowserProvider, type Contract, type JsonRpcSigner } from "ethers"
import { toast } from "@/components/ui/use-toast"
import {
  getContract,
  TOKEN_IDS,
  hasClaimedInitialTokens,
  getPricePerToken,
  getRaffleInfo,
  getUserRaffleEntry,
} from "@/lib/contract"

export function useContract() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)
  const [userAddress, setUserAddress] = useState<string>("")
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [balance, setBalance] = useState<string>("0")
  const [loroRojoBalance, setLoroRojoBalance] = useState<string>("0")
  const [loroMoradoBalance, setLoroMoradoBalance] = useState<string>("0")
  const [hasClaimed, setHasClaimed] = useState<boolean>(false)
  const [pricePerToken, setPricePerToken] = useState<string>("0.1")
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Variables de estado para la rifa
  const [raffleEndTimestamp, setRaffleEndTimestamp] = useState<string>("0")
  const [rafflePool, setRafflePool] = useState<string>("0")
  const [userRaffleEntry, setUserRaffleEntry] = useState<string>("0")
  const [isRaffleActive, setIsRaffleActive] = useState<boolean>(false)

  // Inicializar el provider si window.ethereum está disponible
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const web3Provider = new BrowserProvider(window.ethereum)
      setProvider(web3Provider)

      // Comprobar si ya está conectado
      web3Provider
        .listAccounts()
        .then(async (accounts) => {
          if (accounts.length > 0) {
            const newSigner = await web3Provider.getSigner()
            const contractInstance = await getContract(web3Provider, newSigner)

            setIsConnected(true)
            setUserAddress(accounts[0].address)
            setSigner(newSigner)
            setContract(contractInstance)

            // Obtener balances y estado de reclamación
            fetchBalances(contractInstance, accounts[0].address)
            checkClaimStatus(contractInstance, accounts[0].address)
            fetchPricePerToken(contractInstance)
            fetchRaffleInfo()
          }
        })
        .catch((error) => {
          console.error("Error checking accounts:", error)
        })

      // Escuchar cambios de cuenta
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          // Usuario desconectó su wallet
          setIsConnected(false)
          setUserAddress("")
          setSigner(null)
          setContract(null)
          setBalance("0")
          setLoroRojoBalance("0")
          setLoroMoradoBalance("0")
          setHasClaimed(false)
        } else {
          // Cambio de cuenta
          handleAccountChange(accounts[0], web3Provider)
        }
      })

      // Escuchar cambios de red
      window.ethereum.on("chainChanged", () => {
        window.location.reload()
      })

      return () => {
        // Limpiar listeners
        window.ethereum.removeAllListeners("accountsChanged")
        window.ethereum.removeAllListeners("chainChanged")
      }
    }
  }, [])

  // Manejar cambio de cuenta
  const handleAccountChange = async (newAccount: string, provider: BrowserProvider) => {
    try {
      const newSigner = await provider.getSigner()
      const contractInstance = await getContract(provider, newSigner)

      setIsConnected(true)
      setUserAddress(newAccount)
      setSigner(newSigner)
      setContract(contractInstance)

      // Actualizar balances y estado de reclamación
      fetchBalances(contractInstance, newAccount)
      checkClaimStatus(contractInstance, newAccount)
      fetchRaffleInfo()
    } catch (error) {
      console.error("Error handling account change:", error)
      toast({
        title: "Error",
        description: "No se pudo cambiar de cuenta",
        variant: "destructive",
      })
    }
  }

  // Conectar wallet
  const connectWallet = async () => {
    if (!provider) {
      toast({
        title: "MetaMask no detectado",
        description: "Por favor instala MetaMask para continuar",
        variant: "destructive",
      })
      return
    }

    try {
      setIsConnecting(true)
      await window.ethereum.request({ method: "eth_requestAccounts" })
      const accounts = await provider.listAccounts()
      const newSigner = await provider.getSigner()
      const contractInstance = await getContract(provider, newSigner)

      setIsConnected(true)
      setUserAddress(accounts[0].address)
      setSigner(newSigner)
      setContract(contractInstance)

      // Obtener balances y estado de reclamación
      await fetchBalances(contractInstance, accounts[0].address)
      await checkClaimStatus(contractInstance, accounts[0].address)
      await fetchPricePerToken(contractInstance)
      await fetchRaffleInfo()

      toast({
        title: "¡Conectado!",
        description: "Tu billetera ha sido conectada exitosamente",
      })
    } catch (error) {
      console.error("Error connecting wallet:", error)
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar a MetaMask",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  // Obtener balances
  const fetchBalances = async (contractInstance: Contract, address: string) => {
    try {
      const pirotBalance = await contractInstance.balanceOf(address, TOKEN_IDS.PIROT)
      const loroRojoBalance = await contractInstance.balanceOf(address, TOKEN_IDS.LORO_ROJO)
      const loroMoradoBalance = await contractInstance.balanceOf(address, TOKEN_IDS.LORO_MORADO)

      setBalance(pirotBalance.toString())
      setLoroRojoBalance(loroRojoBalance.toString())
      setLoroMoradoBalance(loroMoradoBalance.toString())
    } catch (error) {
      console.error("Error fetching balances:", error)
    }
  }

  // Verificar si el usuario ya ha reclamado tokens iniciales
  const checkClaimStatus = async (contractInstance: Contract, address: string) => {
    try {
      const claimed = await hasClaimedInitialTokens(contractInstance, address)
      setHasClaimed(claimed)
    } catch (error) {
      console.error("Error checking claim status:", error)
    }
  }

  // Obtener precio por token
  const fetchPricePerToken = async (contractInstance: Contract) => {
    try {
      const price = await getPricePerToken(contractInstance)
      setPricePerToken(price)
    } catch (error) {
      console.error("Error fetching price per token:", error)
    }
  }

  // Reclamar tokens iniciales
  const claimInitialTokens = async () => {
    if (!contract || !signer) {
      toast({
        title: "Error",
        description: "No hay conexión con el contrato",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      const tx = await contract.claimInitialTokens()
      toast({
        title: "Transacción enviada",
        description: "Esperando confirmación...",
      })

      await tx.wait()

      // Actualizar balances y estado de reclamación
      await fetchBalances(contract, userAddress)
      setHasClaimed(true)

      toast({
        title: "¡Tokens reclamados!",
        description: "Has recibido 10 tokens Pirot",
      })
    } catch (error: any) {
      console.error("Error claiming tokens:", error)

      // Manejar errores específicos
      if (error.reason && error.reason.includes("Ya reclamaste")) {
        toast({
          title: "Error",
          description: "Ya has reclamado tus tokens iniciales",
          variant: "destructive",
        })
        setHasClaimed(true)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron reclamar los tokens",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Comprar tokens Pirot con ETH
  const buyPirotTokens = async (amount: string) => {
    if (!contract || !signer) {
      toast({
        title: "Error",
        description: "No hay conexión con el contrato",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      const amountNum = Number.parseInt(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Cantidad inválida")
      }

      // Calcular el costo en ETH
      const priceInEth = await contract.pricePerToken()
      const totalCost = priceInEth * BigInt(amountNum)

      const tx = await contract.buyPirotTokens(amountNum, { value: totalCost })
      toast({
        title: "Transacción enviada",
        description: "Comprando tokens Pirot...",
      })

      await tx.wait()

      // Actualizar balance
      await fetchBalances(contract, userAddress)

      toast({
        title: "¡Compra exitosa!",
        description: `Has comprado ${amount} tokens Pirot`,
      })

      return true
    } catch (error: any) {
      console.error("Error buying tokens:", error)
      toast({
        title: "Error",
        description: error.reason || "No se pudieron comprar los tokens",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Jugar a cara o cruz
  const playCoinFlip = async (amount: string, guessHeads: boolean) => {
    if (!contract || !signer) {
      toast({
        title: "Error",
        description: "No hay conexión con el contrato",
        variant: "destructive",
      })
      return null
    }

    try {
      setIsLoading(true)
      const amountNum = Number.parseInt(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Cantidad inválida")
      }

      // Verificar balance
      const currentBalance = await contract.balanceOf(userAddress, TOKEN_IDS.PIROT)
      if (currentBalance < amountNum) {
        throw new Error("Balance insuficiente")
      }

      // Crear una promesa para esperar el evento
      const resultPromise = new Promise((resolve, reject) => {
        // Escuchar el evento CoinFlipResult
        contract.once("CoinFlipResult", (user, guess, result, reward, event) => {
          if (user.toLowerCase() === userAddress.toLowerCase()) {
            resolve({
              user,
              guessHeads: guess,
              result,
              reward: reward.toString(),
              win: guess === result,
            })
          }
        })

        // Timeout para evitar que la promesa quede pendiente para siempre
        setTimeout(() => {
          reject(new Error("Timeout esperando resultado"))
        }, 60000) // 60 segundos
      })

      // Enviar la transacción
      const tx = await contract.coinFlip(amountNum, guessHeads)
      toast({
        title: "Transacción enviada",
        description: "Lanzando la moneda...",
      })

      await tx.wait()

      // Esperar el resultado del evento
      const result = await resultPromise

      // Actualizar balance
      await fetchBalances(contract, userAddress)

      return result
    } catch (error: any) {
      console.error("Error playing coin flip:", error)
      toast({
        title: "Error",
        description: error.reason || "Ocurrió un error durante el juego",
        variant: "destructive",
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Transferir NFT
  const transferToken = async (to: string, id: number, amount: number) => {
    if (!contract || !signer) {
      toast({
        title: "Error",
        description: "No hay conexión con el contrato",
        variant: "destructive",
      })
      return false
    }

    try {
      setIsLoading(true)

      // Verificar que el usuario tenga suficientes tokens
      const balance = await contract.balanceOf(userAddress, id)
      if (balance < amount) {
        throw new Error("No tienes suficientes tokens para transferir")
      }

      const tx = await contract.transferNFT(to, id, amount)
      toast({
        title: "Transacción enviada",
        description: "Transfiriendo tokens...",
      })

      await tx.wait()

      // Actualizar balances
      await fetchBalances(contract, userAddress)

      toast({
        title: "¡Transferencia exitosa!",
        description: `Has transferido ${amount} token(s) a ${to.substring(0, 6)}...${to.substring(38)}`,
      })

      return true
    } catch (error: any) {
      console.error("Error transferring tokens:", error)
      toast({
        title: "Error",
        description: error.reason || "No se pudieron transferir los tokens",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Actualizar la función buyAccessory para usar la nueva función del contrato
  const buyAccessory = async (id: number) => {
    if (!contract || !signer) {
      toast({
        title: "Error",
        description: "No hay conexión con el contrato",
        variant: "destructive",
      })
      return false
    }

    try {
      setIsLoading(true)

      // Verificar que el usuario tenga suficientes tokens
      const accessoryValue = await contract.accessoryValue(id)
      const currentBalance = await contract.balanceOf(userAddress, TOKEN_IDS.PIROT)

      if (currentBalance < accessoryValue) {
        throw new Error("Balance insuficiente")
      }

      // Usar la nueva función buyAccessory del contrato
      const tx = await contract.buyAccessory(id, 1)
      toast({
        title: "Transacción enviada",
        description: "Comprando accesorio...",
      })

      await tx.wait()

      // Actualizar balances
      await fetchBalances(contract, userAddress)

      toast({
        title: "¡Compra exitosa!",
        description: `Has comprado el Loro ${id === TOKEN_IDS.LORO_ROJO ? "Rojo" : "Morado"}`,
      })

      return true
    } catch (error: any) {
      console.error("Error buying accessory:", error)
      toast({
        title: "Error",
        description: error.reason || "No se pudo comprar el accesorio",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Función para obtener información de la rifa
  const fetchRaffleInfo = async () => {
    if (!contract || !userAddress) return

    try {
      const { endTimestamp, pool } = await getRaffleInfo(contract)
      const userEntry = await getUserRaffleEntry(contract, userAddress)

      setRaffleEndTimestamp(endTimestamp)
      setRafflePool(pool)
      setUserRaffleEntry(userEntry)
      setIsRaffleActive(Number(endTimestamp) > 0)
    } catch (error) {
      console.error("Error fetching raffle info:", error)
    }
  }

  // Efecto para obtener información de la rifa al cargar
  useEffect(() => {
    if (contract && userAddress) {
      fetchRaffleInfo()
    }
  }, [contract, userAddress])

  // Función para participar en la rifa
  const enterRaffle = async (amount: string) => {
    if (!contract || !signer) {
      toast({
        title: "Error",
        description: "No hay conexión con el contrato",
        variant: "destructive",
      })
      return false
    }

    try {
      setIsLoading(true)
      const amountNum = Number.parseInt(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Cantidad inválida")
      }

      // Verificar balance
      const currentBalance = await contract.balanceOf(userAddress, TOKEN_IDS.PIROT)
      if (currentBalance < amountNum) {
        throw new Error("Balance insuficiente")
      }

      const tx = await contract.enterRaffle(amountNum)
      toast({
        title: "Transacción enviada",
        description: "Participando en la rifa...",
      })

      await tx.wait()

      // Actualizar balance y datos de la rifa
      await fetchBalances(contract, userAddress)
      await fetchRaffleInfo()

      toast({
        title: "¡Participación exitosa!",
        description: `Has entrado en la rifa con ${amount} tokens`,
      })

      return true
    } catch (error: any) {
      console.error("Error entering raffle:", error)
      toast({
        title: "Error",
        description: error.reason || "No se pudo procesar tu participación",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Función para ejecutar la rifa (solo para el owner)
  const executeRaffle = async () => {
    if (!contract || !signer) {
      toast({
        title: "Error",
        description: "No hay conexión con el contrato",
        variant: "destructive",
      })
      return false
    }

    try {
      setIsLoading(true)

      const tx = await contract.executeRaffle()
      toast({
        title: "Transacción enviada",
        description: "Ejecutando la rifa...",
      })

      await tx.wait()

      // Actualizar datos de la rifa
      await fetchRaffleInfo()
      await fetchBalances(contract, userAddress)

      toast({
        title: "¡Rifa ejecutada!",
        description: "El ganador ha sido seleccionado",
      })

      return true
    } catch (error: any) {
      console.error("Error executing raffle:", error)
      toast({
        title: "Error",
        description: error.reason || "No se pudo ejecutar la rifa",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Vender accesorio
  const sellAccessory = async (id: number) => {
    if (!contract || !signer) {
      toast({
        title: "Error",
        description: "No hay conexión con el contrato",
        variant: "destructive",
      })
      return false
    }

    try {
      setIsLoading(true)

      // Verificar que el usuario tenga el accesorio
      const accessoryBalance = await contract.balanceOf(userAddress, id)
      if (accessoryBalance < 1) {
        throw new Error("No tienes este accesorio")
      }

      const tx = await contract.sellAccessory(id, 1)
      toast({
        title: "Transacción enviada",
        description: "Vendiendo accesorio...",
      })

      await tx.wait()

      // Actualizar balances
      await fetchBalances(contract, userAddress)

      toast({
        title: "¡Venta exitosa!",
        description: `Has vendido el Loro ${id === TOKEN_IDS.LORO_ROJO ? "Rojo" : "Morado"}`,
      })

      return true
    } catch (error: any) {
      console.error("Error selling accessory:", error)
      toast({
        title: "Error",
        description: error.reason || "No se pudo vender el accesorio",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Actualizar balances (función pública para llamar desde componentes)
  const refreshBalances = useCallback(async () => {
    if (contract && userAddress) {
      await fetchBalances(contract, userAddress)
    }
  }, [contract, userAddress])

  return {
    provider,
    signer,
    contract,
    userAddress,
    isConnected,
    isConnecting,
    isLoading,
    balance,
    loroRojoBalance,
    loroMoradoBalance,
    hasClaimed,
    pricePerToken,
    connectWallet,
    claimInitialTokens,
    buyPirotTokens,
    playCoinFlip,
    buyAccessory,
    sellAccessory,
    refreshBalances,
    transferToken,
    enterRaffle,
    executeRaffle,
    raffleEndTimestamp,
    rafflePool,
    userRaffleEntry,
    isRaffleActive,
    fetchRaffleInfo,
  }
}
