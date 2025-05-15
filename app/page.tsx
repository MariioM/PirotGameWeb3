"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Coins, Skull, Sparkles, Wallet, CoinsIcon as CoinIcon, Timer, Trophy, Users, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useContract } from "@/hooks/use-contract"
import { TOKEN_IDS } from "@/lib/contract"
import Link from "next/link"

// Importar el componente TransferModal
import { TransferModal } from "@/components/transfer-modal"

// Definición de tipos para NFTs y Rifas
type NFT = {
  id: number
  name: string
  rarity: string
  image: string
  description: string
  price: number
  color: string
}

type RaffleEntry = {
  address: string
  amount: number
  timestamp: number
  chance: number
}

type RaffleWinner = {
  address: string
  nftId: number
  nftName: string
  timestamp: number
}

export default function PirotLanding() {
  // Añadir estos estados dentro de la función PirotLanding
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)

  // Usar el hook de contrato
  // Actualizar la desestructuración del hook useContract para incluir las nuevas funciones
  const {
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
    raffleEndTimestamp,
    rafflePool,
    userRaffleEntry,
    isRaffleActive,
    fetchRaffleInfo,
  } = useContract()

  const [buyAmount, setBuyAmount] = useState("")
  const [betAmount, setBetAmount] = useState("")
  const [guessHeads, setGuessHeads] = useState(true)
  const [coinFlipResult, setCoinFlipResult] = useState<null | boolean>(null)
  const [isFlipping, setIsFlipping] = useState(false)

  // Estados para la rifa (simulada)
  const [raffleTimeRemaining, setRaffleTimeRemaining] = useState(1800) // 30 minutos en segundos
  const [raffleEntryAmount, setRaffleEntryAmount] = useState("")
  const [currentRaffleNFT, setCurrentRaffleNFT] = useState<NFT | null>(null)
  const [raffleEntries, setRaffleEntries] = useState<RaffleEntry[]>([])
  const [raffleHistory, setRaffleHistory] = useState<RaffleWinner[]>([])
  const [userRaffleChance, setUserRaffleChance] = useState(0)
  const [totalRafflePool, setTotalRafflePool] = useState(0)
  const [isEnteringRaffle, setIsEnteringRaffle] = useState(false)

  // NFTs disponibles para rifas (actualizados para usar solo los NFTs que existen en el contrato)
  const availableRaffleNFTs: NFT[] = [
    {
      id: TOKEN_IDS.LORO_ROJO,
      name: "Loro Pirata Rojo",
      rarity: "Raro",
      image: "🦜",
      description: "Un loro rojo que se posa en tu hombro. Otorga +5% de tokens en cada victoria.",
      price: 10, // Valor real en el contrato
      color: "red",
    },
    {
      id: TOKEN_IDS.LORO_MORADO,
      name: "Loro Pirata Morado",
      rarity: "Legendario",
      image: "🦜",
      description: "Un loro morado mágico. Otorga +10% de tokens en cada victoria y una predicción gratuita al día.",
      price: 5, // Valor real en el contrato
      color: "purple",
    },
  ]

  useEffect(() => {
    // Inicializar la rifa actual (simulada)
    initializeRaffle()

    // Temporizador para la cuenta regresiva de la rifa
    const raffleTimer = setInterval(() => {
      setRaffleTimeRemaining((prev) => {
        if (prev <= 1) {
          // Cuando el tiempo llega a cero, ejecutar el sorteo y reiniciar
          handleExecuteRaffle()
          return 1800 // Reiniciar a 30 minutos
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(raffleTimer)
    }
  }, [])

  // Efecto para calcular las probabilidades cuando cambian las entradas
  useEffect(() => {
    if (totalRafflePool === 0) return

    // Calcular la probabilidad del usuario actual
    const userEntries = raffleEntries.filter((entry) => entry.address === userAddress)
    const userTotalAmount = userEntries.reduce((sum, entry) => sum + entry.amount, 0)
    const userChance = (userTotalAmount / totalRafflePool) * 100

    setUserRaffleChance(userChance)
  }, [raffleEntries, userAddress, totalRafflePool])

  const initializeRaffle = () => {
    // Seleccionar un NFT aleatorio para la rifa actual
    const randomNFT = availableRaffleNFTs[Math.floor(Math.random() * availableRaffleNFTs.length)]
    setCurrentRaffleNFT(randomNFT)

    // Inicializar con valores vacíos para mostrar solo participantes reales
    setRaffleEntries([])
    setTotalRafflePool(0)
    setUserRaffleChance(0)
    setRaffleHistory([])
  }

  const handleExecuteRaffle = () => {
    if (!currentRaffleNFT || raffleEntries.length === 0) {
      // Si no hay participantes, simplemente cambiar al otro NFT
      const otherNFT = availableRaffleNFTs.find((nft) => nft.id !== currentRaffleNFT?.id) || availableRaffleNFTs[0]
      setCurrentRaffleNFT(otherNFT)
      return
    }

    // Seleccionar un ganador basado en las probabilidades
    const random = Math.random() * 100
    let cumulativeChance = 0
    let winner: RaffleEntry | null = null

    for (const entry of raffleEntries) {
      cumulativeChance += entry.chance
      if (random <= cumulativeChance) {
        winner = entry
        break
      }
    }

    // Si no se encontró un ganador (por redondeo), tomar el último
    if (!winner) {
      winner = raffleEntries[raffleEntries.length - 1]
    }

    // Registrar al ganador en el historial
    const newWinner: RaffleWinner = {
      address: winner.address,
      nftId: currentRaffleNFT.id,
      nftName: currentRaffleNFT.name,
      timestamp: Date.now(),
    }

    setRaffleHistory((prev) => [newWinner, ...prev])

    // Mostrar notificación si el ganador es el usuario actual
    if (winner.address === userAddress) {
      toast({
        title: "¡Has ganado la rifa!",
        description: `¡Felicidades! Has ganado el NFT "${currentRaffleNFT.name}"`,
        variant: "default",
      })
    } else {
      toast({
        title: "Rifa finalizada",
        description: `El ganador del "${currentRaffleNFT.name}" es ${winner.address.substring(0, 6)}...${winner.address.substring(38)}`,
        variant: "default",
      })
    }

    // Reiniciar la rifa con un nuevo NFT
    // Asegurarse de que el nuevo NFT sea diferente al actual
    const otherNFT = availableRaffleNFTs.find((nft) => nft.id !== currentRaffleNFT.id) || availableRaffleNFTs[0]
    setCurrentRaffleNFT(otherNFT)
    setRaffleEntries([])
    setTotalRafflePool(0)
    setUserRaffleChance(0)
  }

  // Actualizar la función handleCoinFlip para reflejar la nueva recompensa de 2x
  const handleCoinFlip = async () => {
    if (!betAmount || Number.parseFloat(betAmount) <= 0) {
      toast({
        title: "Cantidad inválida",
        description: "Por favor ingresa una cantidad válida para jugar",
        variant: "destructive",
      })
      return
    }

    if (Number.parseInt(betAmount) > Number.parseInt(balance)) {
      toast({
        title: "Balance insuficiente",
        description: "No tienes suficientes tokens para esta partida",
        variant: "destructive",
      })
      return
    }

    setIsFlipping(true)
    setCoinFlipResult(null)

    try {
      const result = await playCoinFlip(betAmount, guessHeads)

      if (result) {
        setCoinFlipResult(result.result)

        if (result.win) {
          toast({
            title: "¡Has ganado!",
            description: `Ganaste ${result.reward} tokens Pirot (2x tu apuesta)`,
          })
        } else {
          toast({
            title: "Has perdido",
            description: `Perdiste ${betAmount} tokens Pirot`,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Ocurrió un error durante el juego",
        variant: "destructive",
      })
    } finally {
      setIsFlipping(false)
    }
  }

  const handleBuyAccessory = async (id: number) => {
    const price = id === TOKEN_IDS.LORO_ROJO ? 10 : 5 // Valores del contrato

    if (Number.parseInt(balance) < price) {
      toast({
        title: "Balance insuficiente",
        description: "No tienes suficientes tokens para comprar este accesorio",
        variant: "destructive",
      })
      return
    }

    await buyAccessory(id)
  }

  const handleSellAccessory = async (id: number) => {
    const balance = id === TOKEN_IDS.LORO_ROJO ? loroRojoBalance : loroMoradoBalance

    if (Number.parseInt(balance) < 1) {
      toast({
        title: "No tienes este accesorio",
        description: "No puedes vender lo que no tienes",
        variant: "destructive",
      })
      return
    }

    await sellAccessory(id)
  }

  // Actualizar la función enterRaffle para usar la implementación real
  const handleEnterRaffle = async () => {
    if (!isConnected) {
      toast({
        title: "Error",
        description: "Debes conectar tu wallet para participar en la rifa",
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseInt(raffleEntryAmount)

    if (!raffleEntryAmount || amount <= 0) {
      toast({
        title: "Cantidad inválida",
        description: "Por favor ingresa una cantidad válida",
        variant: "destructive",
      })
      return
    }

    // Verificar que el usuario tenga suficiente balance
    if (amount > Number.parseInt(balance)) {
      toast({
        title: "Balance insuficiente",
        description: "No tienes suficientes tokens para esta participación",
        variant: "destructive",
      })
      return
    }

    setIsEnteringRaffle(true)

    try {
      const success = await enterRaffle(raffleEntryAmount)
      if (success) {
        setRaffleEntryAmount("")

        // Actualizar la UI con los datos reales de la rifa
        const userEntryNum = Number.parseInt(userRaffleEntry) + amount
        const poolNum = Number.parseInt(rafflePool) + amount
        const userChance = (userEntryNum / poolNum) * 100

        // Añadir la entrada del usuario actual a la lista de participantes
        const newEntry: RaffleEntry = {
          address: userAddress,
          amount: amount,
          timestamp: Date.now(),
          chance: userChance,
        }

        setRaffleEntries((prev) => [...prev, newEntry])
        setTotalRafflePool(poolNum)
        setUserRaffleChance(userChance)
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "No se pudo procesar tu participación",
        variant: "destructive",
      })
    } finally {
      setIsEnteringRaffle(false)
    }
  }

  const handleBuyTokens = async () => {
    if (!buyAmount || Number.parseFloat(buyAmount) <= 0) {
      toast({
        title: "Cantidad inválida",
        description: "Por favor ingresa una cantidad válida para comprar",
        variant: "destructive",
      })
      return
    }

    try {
      await buyPirotTokens(buyAmount)
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Ocurrió un error durante la compra",
        variant: "destructive",
      })
    }
  }

  // Función para formatear el tiempo restante
  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`
  }

  // Función para formatear direcciones
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(38)}`
  }

  // Función para formatear timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  return (
    <div className="min-h-screen bg-[#1a0f37] text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[#1a0f37]"></div>
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          {Array.from({ length: 12 }).map((_, i) => {
            // Valores predefinidos para evitar cambios bruscos en rerenderizados
            const positions = [
              { top: "15%", left: "10%" },
              { top: "25%", left: "30%" },
              { top: "10%", left: "50%" },
              { top: "20%", left: "70%" },
              { top: "35%", left: "85%" },
              { top: "50%", left: "20%" },
              { top: "65%", left: "35%" },
              { top: "70%", left: "65%" },
              { top: "85%", left: "15%" },
              { top: "80%", left: "45%" },
              { top: "90%", left: "75%" },
              { top: "40%", left: "90%" },
            ]

            // Tamaños predefinidos para consistencia
            const sizes = [80, 100, 120, 90, 110, 70, 130, 85, 95, 105, 75, 115]

            // Duraciones de animación variadas pero fijas
            const durations = [25, 30, 35, 28, 32, 27, 33, 29, 31, 26, 34, 24]

            return (
              <motion.div
                key={i}
                className="absolute rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                style={{
                  top: positions[i].top,
                  left: positions[i].left,
                  width: `${sizes[i]}px`,
                  height: `${sizes[i]}px`,
                }}
                animate={{
                  y: [0, 30, 0],
                  opacity: [0.2, 0.3, 0.2],
                }}
                transition={{
                  duration: durations[i],
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  repeatType: "reverse",
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10">
        {/* Hero section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 font-[Pirata One] text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500">
              ¡Únete a la tripulación de Pirot!
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-purple-200 font-[Poppins]">
              Navega, colecciona y domina los mares de Ethereum.
            </p>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative">
              <Button
                id="connectButton"
                onClick={connectWallet}
                disabled={isConnected || isConnecting}
                className={cn(
                  "text-lg px-8 py-6 rounded-xl font-bold relative overflow-hidden group",
                  isConnected
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-600 hover:to-red-600",
                )}
                size="lg"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isConnected ? (
                    <>
                      <Wallet className="w-5 h-5" />
                      Conectado
                    </>
                  ) : isConnecting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      >
                        <Wallet className="w-5 h-5" />
                      </motion.div>
                      Conectando...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-5 h-5" />
                      Conectar con MetaMask
                    </>
                  )}
                </span>
                {!isConnected && !isConnecting && (
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-yellow-400 to-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                )}
              </Button>
              {!isConnected && !isConnecting && (
                <motion.div
                  className="absolute -inset-1 rounded-xl bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 opacity-70 blur-sm"
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "reverse",
                  }}
                />
              )}
            </motion.div>
          </motion.div>

          {/* Floating coins animation */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 10 }).map((_, i) => {
              // Posiciones iniciales fijas para evitar saltos
              const positions = [
                { top: "10%", left: "20%" },
                { top: "15%", left: "70%" },
                { top: "30%", left: "40%" },
                { top: "45%", left: "80%" },
                { top: "60%", left: "25%" },
                { top: "70%", left: "60%" },
                { top: "80%", left: "35%" },
                { top: "25%", left: "90%" },
                { top: "50%", left: "15%" },
                { top: "85%", left: "75%" },
              ]

              // Tamaños consistentes
              const sizes = [24, 28, 22, 30, 26, 20, 32, 25, 27, 23]

              // Duraciones variadas pero fijas
              const durations = [8, 10, 7, 9, 11, 6, 12, 8.5, 9.5, 7.5]

              // Retrasos fijos para escalonar las animaciones
              const delays = [0, 1, 2, 0.5, 1.5, 2.5, 0.8, 1.8, 2.2, 1.2]

              return (
                <motion.div
                  key={i}
                  className="absolute text-yellow-500"
                  style={{
                    top: positions[i].top,
                    left: positions[i].left,
                    fontSize: `${sizes[i]}px`,
                  }}
                  animate={{
                    y: [0, 80, 160],
                    rotate: [0, 180, 360],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: durations[i],
                    repeat: Number.POSITIVE_INFINITY,
                    delay: delays[i],
                    ease: "easeInOut",
                  }}
                >
                  <CoinIcon />
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* User status section */}
        {isConnected && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="py-16 px-4"
          >
            <div className="max-w-4xl mx-auto">
              <div className="bg-purple-900/50 backdrop-blur-md rounded-2xl p-8 border border-purple-700/50 shadow-lg">
                <h2 className="text-3xl font-[Pirata One] mb-6 text-center text-yellow-400">Estado del Usuario</h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-purple-800/50 rounded-xl p-4 border border-purple-600/50">
                    <p className="text-purple-300 mb-2">Dirección:</p>
                    <p id="userAddress" className="font-mono text-sm break-all bg-purple-950/50 p-2 rounded">
                      {userAddress}
                    </p>
                  </div>

                  <div className="bg-purple-800/50 rounded-xl p-4 border border-purple-600/50">
                    <p className="text-purple-300 mb-2">Balance de Tokens:</p>
                    <p id="balanceDisplay" className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
                      <CoinIcon className="text-yellow-500" />
                      {balance} <span className="text-sm text-yellow-300">PIROT</span>
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-4 justify-center">
                  <Button
                    id="claimButton"
                    onClick={claimInitialTokens}
                    disabled={hasClaimed || isLoading}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                        >
                          <Coins className="mr-2 h-4 w-4" />
                        </motion.div>
                        Procesando...
                      </span>
                    ) : (
                      <>
                        <Coins className="mr-2 h-4 w-4" />
                        {hasClaimed ? "Ya Reclamado" : "Reclamar Tokens"}
                      </>
                    )}
                  </Button>

                  <Button
                    id="balanceButton"
                    onClick={refreshBalances}
                    disabled={isLoading}
                    variant="outline"
                    className="border-purple-500 text-purple-200 hover:bg-purple-800/30"
                  >
                    <CoinIcon className="mr-2 h-4 w-4" />
                    Actualizar Balance
                  </Button>
                  {/* Añadir este botón en la sección de "User status section" justo después del botón "Actualizar Balance" */}
                  <Button
                    onClick={() => setIsTransferModalOpen(true)}
                    variant="outline"
                    className="border-purple-500 text-purple-200 hover:bg-purple-800/30"
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    Transferir Tokens
                  </Button>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Buy tokens section */}
        {isConnected && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="py-16 px-4 bg-gradient-to-b from-transparent to-purple-900/20"
          >
            <div className="max-w-4xl mx-auto">
              <div className="bg-purple-900/50 backdrop-blur-md rounded-2xl p-8 border border-purple-700/50 shadow-lg">
                <h2 className="text-3xl font-[Pirata One] mb-6 text-center text-yellow-400">Comprar Tokens Pirot</h2>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Input
                        id="buyAmount"
                        type="number"
                        value={buyAmount}
                        onChange={(e) => setBuyAmount(e.target.value)}
                        placeholder="Cantidad de tokens"
                        className="bg-purple-800/50 border-purple-600 text-white placeholder:text-purple-400 pl-10"
                        disabled={isLoading}
                      />
                      <CoinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-500 h-5 w-5" />
                    </div>
                  </div>

                  <Button
                    id="buyButton"
                    onClick={handleBuyTokens}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-600 hover:to-red-600 text-white"
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                        >
                          <Coins className="mr-2 h-4 w-4" />
                        </motion.div>
                        Procesando...
                      </span>
                    ) : (
                      <>
                        <Coins className="mr-2 h-4 w-4" />
                        Comprar Tokens
                      </>
                    )}
                  </Button>
                </div>

                <p className="mt-4 text-sm text-purple-300 text-center">
                  Los tokens Pirot te permiten jugar y comprar accesorios NFT exclusivos.
                  <br />
                  Precio: {pricePerToken} ETH por token.
                </p>
              </div>
            </div>
          </motion.section>
        )}

        {/* Coin flip game section */}
        {isConnected && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="py-16 px-4"
          >
            <div className="max-w-4xl mx-auto">
              <div className="bg-purple-900/50 backdrop-blur-md rounded-2xl p-8 border border-purple-700/50 shadow-lg">
                <h2 className="text-3xl font-[Pirata One] mb-6 text-center text-yellow-400">Juego de Cara o Cruz</h2>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-purple-800/50 rounded-xl p-6 border border-purple-600/50">
                    <h3 className="text-xl font-[Pirata One] mb-4 text-center text-yellow-400">Haz tu Jugada</h3>

                    <div className="space-y-4">
                      <div className="relative">
                        <Input
                          id="betAmount"
                          type="number"
                          value={betAmount}
                          onChange={(e) => setBetAmount(e.target.value)}
                          placeholder="Cantidad a jugar"
                          className="bg-purple-800/50 border-purple-600 text-white placeholder:text-purple-400 pl-10"
                          disabled={isLoading || isFlipping}
                        />
                        <CoinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-500 h-5 w-5" />
                      </div>

                      <div className="flex justify-center gap-4">
                        <Button
                          variant="outline"
                          onClick={() => setGuessHeads(true)}
                          disabled={isLoading || isFlipping}
                          className={cn(
                            "flex-1 border-2",
                            guessHeads
                              ? "border-yellow-500 bg-yellow-500/20 text-yellow-400"
                              : "border-purple-600 bg-purple-800/30 text-purple-300",
                          )}
                        >
                          Cara
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setGuessHeads(false)}
                          disabled={isLoading || isFlipping}
                          className={cn(
                            "flex-1 border-2",
                            !guessHeads
                              ? "border-yellow-500 bg-yellow-500/20 text-yellow-400"
                              : "border-purple-600 bg-purple-800/30 text-purple-300",
                          )}
                        >
                          Cruz
                        </Button>
                      </div>

                      <Button
                        id="flipButton"
                        onClick={handleCoinFlip}
                        disabled={isLoading || isFlipping}
                        className="w-full bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-600 hover:to-red-600 text-white"
                      >
                        {isFlipping || isLoading ? (
                          <span className="flex items-center">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                            >
                              <CoinIcon className="mr-2 h-4 w-4" />
                            </motion.div>
                            Lanzando...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <CoinIcon className="mr-2 h-4 w-4" />
                            Lanzar Moneda
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-purple-800/50 rounded-xl p-6 border border-purple-600/50 flex flex-col items-center justify-center">
                    {coinFlipResult === null ? (
                      <div className="text-center">
                        {isFlipping ? (
                          <div className="perspective-500 mb-4">
                            <motion.div
                              className="w-32 h-32 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center mx-auto preserve-3d"
                              animate={{
                                rotateX: [0, 1080],
                                rotateY: [0, 720],
                                z: [0, 50, 0, -50, 0, 30, 0, -30, 0],
                              }}
                              transition={{
                                duration: 2,
                                ease: "easeInOut",
                              }}
                            >
                              <div className="absolute w-full h-full rounded-full bg-yellow-500/40 border-2 border-yellow-500/70 flex items-center justify-center backface-hidden">
                                <span className="text-6xl">👑</span>
                              </div>
                              <div className="absolute w-full h-full rounded-full bg-yellow-500/40 border-2 border-yellow-500/70 flex items-center justify-center backface-hidden rotate-y-180">
                                <span className="text-6xl">⚓</span>
                              </div>
                            </motion.div>
                          </div>
                        ) : (
                          <motion.div
                            className="w-32 h-32 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center mb-4 mx-auto"
                            animate={{
                              rotateY: [0, 10, 0, -10, 0],
                              rotateX: [0, 5, 0, -5, 0],
                            }}
                            transition={{
                              duration: 3,
                              repeat: Number.POSITIVE_INFINITY,
                              repeatType: "reverse",
                            }}
                          >
                            <CoinIcon className="h-16 w-16 text-yellow-500" />
                          </motion.div>
                        )}
                        <p className="text-purple-300">
                          {isFlipping ? "Lanzando la moneda..." : "Haz tu elección y lanza la moneda"}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <motion.div
                          initial={{ scale: 1.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.5, type: "spring" }}
                          className="w-32 h-32 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center mb-4 mx-auto"
                        >
                          {coinFlipResult ? <span className="text-6xl">👑</span> : <span className="text-6xl">⚓</span>}
                        </motion.div>
                        <motion.h3
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="text-xl font-[Pirata One] mb-2 text-yellow-400"
                        >
                          {coinFlipResult ? "¡Cara!" : "¡Cruz!"}
                        </motion.h3>
                        <motion.p
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="text-purple-300"
                        >
                          {coinFlipResult === guessHeads ? "¡Has ganado!" : "Has perdido"}
                        </motion.p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actualizar el texto en la sección de "Coin flip game" para reflejar la nueva recompensa */}
                <div className="mt-6">
                  <p className="text-sm text-purple-300 text-center">
                    Juega con tus tokens Pirot y gana 2x tu inversión si aciertas. ¡La suerte del pirata te acompaña!
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* NFT accessories section */}
        {isConnected && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="py-16 px-4 bg-gradient-to-b from-transparent to-purple-900/20"
          >
            <div className="max-w-4xl mx-auto">
              <div className="bg-purple-900/50 backdrop-blur-md rounded-2xl p-8 border border-purple-700/50 shadow-lg">
                <h2 className="text-3xl font-[Pirata One] mb-6 text-center text-yellow-400">
                  Colección de Accesorios NFT
                </h2>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-purple-800/50 rounded-xl p-6 border border-purple-600/50 relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 text-purple-700/20 transform rotate-12">
                      <Sparkles size={80} />
                    </div>

                    <div className="text-center">
                      <motion.div
                        className="w-32 h-32 rounded-full bg-red-600/30 border-2 border-red-500/50 flex items-center justify-center mb-4 mx-auto"
                        animate={{
                          y: [0, -5, 0],
                          rotate: [0, 5, 0, -5, 0],
                        }}
                        transition={{
                          duration: 5,
                          repeat: Number.POSITIVE_INFINITY,
                          repeatType: "reverse",
                        }}
                      >
                        <span className="text-6xl">🦜</span>
                      </motion.div>

                      <h3 className="text-xl font-[Pirata One] mb-2 text-red-400">Loro Rojo</h3>
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-full">Raro</span>
                        <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded-full">
                          10 PIROT
                        </span>
                      </div>

                      <p className="text-sm text-purple-300 mb-6">
                        Un loro rojo que se posa en tu hombro. Otorga +5% de tokens en cada victoria.
                      </p>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleBuyAccessory(TOKEN_IDS.LORO_ROJO)}
                          disabled={isLoading}
                          className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                        >
                          {isLoading ? (
                            <span className="flex items-center">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                              >
                                <Coins className="mr-2 h-4 w-4" />
                              </motion.div>
                              Procesando...
                            </span>
                          ) : (
                            <>
                              <Coins className="mr-2 h-4 w-4" />
                              Comprar
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleSellAccessory(TOKEN_IDS.LORO_ROJO)}
                          disabled={isLoading || Number(loroRojoBalance) < 1}
                          variant="outline"
                          className="flex-1 border-red-500 text-red-400 hover:bg-red-900/30"
                        >
                          Vender ({loroRojoBalance})
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-800/50 rounded-xl p-6 border border-purple-600/50 relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 text-purple-700/20 transform rotate-12">
                      <Sparkles size={80} />
                    </div>

                    <div className="text-center">
                      <motion.div
                        className="w-32 h-32 rounded-full bg-purple-600/30 border-2 border-purple-500/50 flex items-center justify-center mb-4 mx-auto"
                        animate={{
                          y: [0, -5, 0],
                          rotate: [0, 5, 0, -5, 0],
                        }}
                        transition={{
                          duration: 5,
                          repeat: Number.POSITIVE_INFINITY,
                          repeatType: "reverse",
                        }}
                      >
                        <span className="text-6xl">🦜</span>
                      </motion.div>

                      <h3 className="text-xl font-[Pirata One] mb-2 text-purple-400">Loro Morado</h3>
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded-full">
                          Legendario
                        </span>
                        <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded-full">5 PIROT</span>
                      </div>

                      <p className="text-sm text-purple-300 mb-6">
                        Un loro morado mágico. Otorga +10% de tokens en cada victoria y una predicción gratuita al día.
                      </p>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleBuyAccessory(TOKEN_IDS.LORO_MORADO)}
                          disabled={isLoading}
                          className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
                        >
                          {isLoading ? (
                            <span className="flex items-center">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                              >
                                <Coins className="mr-2 h-4 w-4" />
                              </motion.div>
                              Procesando...
                            </span>
                          ) : (
                            <>
                              <Coins className="mr-2 h-4 w-4" />
                              Comprar
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleSellAccessory(TOKEN_IDS.LORO_MORADO)}
                          disabled={isLoading || Number(loroMoradoBalance) < 1}
                          variant="outline"
                          className="flex-1 border-purple-500 text-purple-400 hover:bg-purple-900/30"
                        >
                          Vender ({loroMoradoBalance})
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Raffle section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="py-16 px-4"
        >
          <div className="max-w-5xl mx-auto">
            <div className="bg-purple-900/50 backdrop-blur-md rounded-2xl p-8 border border-purple-700/50 shadow-lg relative overflow-hidden">
              {/* Background decorations */}
              <div className="absolute -right-10 -top-10 text-purple-800/20 transform rotate-12">
                <Trophy size={100} />
              </div>
              <div className="absolute -left-10 -bottom-10 text-purple-800/20 transform -rotate-12">
                <Timer size={100} />
              </div>

              <h2 className="text-3xl font-[Pirata One] mb-6 text-center text-yellow-400">
                Rifa Pirata - ¡Gana NFTs Exclusivos!
              </h2>

              {currentRaffleNFT && (
                <div className="grid md:grid-cols-2 gap-8">
                  {/* NFT en sorteo */}
                  <div className="space-y-6">
                    <div className="bg-purple-800/50 rounded-xl p-6 border border-purple-600/50 relative overflow-hidden">
                      <div className="absolute -right-10 -top-10 text-purple-700/20 transform rotate-12">
                        <Sparkles size={80} />
                      </div>

                      <h3 className="text-2xl font-[Pirata One] mb-2 text-center text-yellow-400">NFT en Sorteo</h3>

                      <div className="flex flex-col items-center">
                        <div
                          className={`w-32 h-32 rounded-full bg-${currentRaffleNFT.color}-600/30 border-2 border-${currentRaffleNFT.color}-500/50 flex items-center justify-center mb-4`}
                        >
                          <motion.div
                            animate={{
                              y: [0, -5, 0],
                              rotate: [0, 5, 0, -5, 0],
                            }}
                            transition={{
                              duration: 5,
                              repeat: Number.POSITIVE_INFINITY,
                              repeatType: "reverse",
                            }}
                            className="text-7xl"
                          >
                            {currentRaffleNFT.image}
                          </motion.div>
                        </div>

                        <h4 className={`text-xl font-bold text-${currentRaffleNFT.color}-400 mb-1`}>
                          {currentRaffleNFT.name}
                        </h4>

                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`bg-${currentRaffleNFT.color}-500/20 text-${currentRaffleNFT.color}-400 text-xs px-2 py-1 rounded-full`}
                          >
                            {currentRaffleNFT.rarity}
                          </span>
                          <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded-full">
                            {currentRaffleNFT.price} PIROT
                          </span>
                        </div>

                        <p className="text-sm text-purple-300 text-center mt-2">{currentRaffleNFT.description}</p>
                      </div>
                    </div>

                    <div className="bg-purple-800/50 rounded-xl p-6 border border-purple-600/50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-[Pirata One] text-yellow-400">Tiempo Restante</h3>
                        <div className="bg-purple-900/70 px-4 py-2 rounded-lg text-xl font-bold text-yellow-400 flex items-center">
                          <Timer className="mr-2 h-5 w-5 text-yellow-500" />
                          {formatTimeRemaining(raffleTimeRemaining)}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-purple-300">Participantes:</span>
                            <span className="text-sm text-purple-300 flex items-center">
                              <Users className="mr-1 h-3 w-3" />
                              {raffleEntries.length}
                            </span>
                          </div>
                          <Progress value={Math.min(raffleEntries.length * 10, 100)} className="h-2 bg-purple-700/30" />
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-purple-300">Pool Total:</span>
                            <span className="text-sm text-purple-300 flex items-center">
                              <CoinIcon className="mr-1 h-3 w-3 text-yellow-500" />
                              {totalRafflePool} PIROT
                            </span>
                          </div>
                          <Progress
                            value={Math.min((totalRafflePool / (currentRaffleNFT.price * 0.7)) * 100, 100)}
                            className="h-2 bg-purple-700/30"
                          />
                        </div>

                        {isConnected && (
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-purple-300">Tu probabilidad:</span>
                              <span className="text-sm text-purple-300">{userRaffleChance.toFixed(2)}%</span>
                            </div>
                            <Progress value={userRaffleChance} className="h-2 bg-purple-700/30" />
                          </div>
                        )}
                      </div>

                      {isConnected ? (
                        <div className="mt-6 space-y-4">
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <div className="relative">
                                <Input
                                  type="number"
                                  value={raffleEntryAmount}
                                  onChange={(e) => setRaffleEntryAmount(e.target.value)}
                                  placeholder={`Máx: ${Math.floor(currentRaffleNFT.price * 0.7)} PIROT`}
                                  className="bg-purple-800/50 border-purple-600 text-white placeholder:text-purple-400 pl-10"
                                  disabled={isEnteringRaffle}
                                />
                                <CoinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-500 h-5 w-5" />
                              </div>
                            </div>

                            <Button
                              onClick={handleEnterRaffle}
                              disabled={isEnteringRaffle}
                              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                            >
                              {isEnteringRaffle ? (
                                <span className="flex items-center">
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                                  >
                                    <CoinIcon className="mr-2 h-4 w-4" />
                                  </motion.div>
                                  Procesando...
                                </span>
                              ) : (
                                <span className="flex items-center">
                                  <Trophy className="mr-2 h-4 w-4" />
                                  Participar
                                </span>
                              )}
                            </Button>
                          </div>

                          <p className="text-xs text-purple-300 text-center">
                            Cuanto más tokens aportes, mayores serán tus probabilidades de ganar. Máximo 70% del valor
                            del NFT ({Math.floor(currentRaffleNFT.price * 0.7)} PIROT).
                          </p>
                        </div>
                      ) : (
                        <div className="mt-6">
                          <Button
                            onClick={connectWallet}
                            className="w-full bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-600 hover:to-red-600"
                          >
                            <Wallet className="mr-2 h-4 w-4" />
                            Conecta para Participar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Participantes y ganadores */}
                  <div className="space-y-6">
                    <div className="bg-purple-800/50 rounded-xl p-6 border border-purple-600/50">
                      <Tabs defaultValue="participants" className="w-full">
                        <TabsList className="w-full mb-4 bg-purple-900/50">
                          <TabsTrigger value="participants" className="flex-1">
                            <Users className="mr-2 h-4 w-4" />
                            Participantes
                          </TabsTrigger>
                          <TabsTrigger value="winners" className="flex-1">
                            <Trophy className="mr-2 h-4 w-4" />
                            Ganadores Anteriores
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="participants" className="space-y-4">
                          <div className="max-h-80 overflow-y-auto pr-2">
                            {raffleEntries.length > 0 ? (
                              raffleEntries
                                .sort((a, b) => b.amount - a.amount)
                                .map((entry, index) => (
                                  <div
                                    key={index}
                                    className={`p-3 rounded-lg mb-2 flex items-center justify-between ${entry.address === userAddress
                                      ? "bg-emerald-900/30 border border-emerald-700/50"
                                      : "bg-purple-900/30 border border-purple-700/50"
                                      }`}
                                  >
                                    <div className="flex items-center">
                                      <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${index === 0
                                          ? "bg-yellow-500/20 text-yellow-400"
                                          : index === 1
                                            ? "bg-gray-400/20 text-gray-300"
                                            : index === 2
                                              ? "bg-amber-600/20 text-amber-500"
                                              : "bg-purple-700/20 text-purple-400"
                                          }`}
                                      >
                                        {index + 1}
                                      </div>
                                      <div>
                                        <p
                                          className={`text-sm font-medium ${entry.address === userAddress ? "text-emerald-400" : "text-purple-200"
                                            }`}
                                        >
                                          {formatAddress(entry.address)}
                                          {entry.address === userAddress && " (Tú)"}
                                        </p>
                                        <p className="text-xs text-purple-400">
                                          {new Date(entry.timestamp).toLocaleTimeString()}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-medium text-yellow-400 flex items-center">
                                        <CoinIcon className="mr-1 h-3 w-3" />
                                        {entry.amount}
                                      </p>
                                      <p className="text-xs text-purple-400">{entry.chance.toFixed(1)}% prob.</p>
                                    </div>
                                  </div>
                                ))
                            ) : (
                              <div className="text-center py-8 text-purple-400">
                                <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                <p>¡Sé el primero en participar!</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="winners" className="space-y-4">
                          <div className="max-h-80 overflow-y-auto pr-2">
                            {raffleHistory.length > 0 ? (
                              raffleHistory.map((winner, index) => (
                                <div
                                  key={index}
                                  className={`p-3 rounded-lg mb-2 flex items-center justify-between ${winner.address === userAddress
                                    ? "bg-emerald-900/30 border border-emerald-700/50"
                                    : "bg-purple-900/30 border border-purple-700/50"
                                    }`}
                                >
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center mr-3">
                                      <Trophy className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <p
                                        className={`text-sm font-medium ${winner.address === userAddress ? "text-emerald-400" : "text-purple-200"
                                          }`}
                                      >
                                        {formatAddress(winner.address)}
                                        {winner.address === userAddress && " (Tú)"}
                                      </p>
                                      <p className="text-xs text-purple-400">
                                        {new Date(winner.timestamp).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-yellow-400">{winner.nftName}</p>
                                    <p className="text-xs text-purple-400">ID: {winner.nftId}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8 text-purple-400">
                                <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                <p>Aún no hay ganadores</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>

                    <div className="bg-purple-800/50 rounded-xl p-6 border border-purple-600/50">
                      <h3 className="text-xl font-[Pirata One] mb-4 text-yellow-400">¿Cómo funciona?</h3>

                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-purple-700/50 flex items-center justify-center text-purple-300 flex-shrink-0">
                            1
                          </div>
                          <p className="text-sm text-purple-300">
                            Cada 30 minutos se sortea un NFT exclusivo entre todos los participantes.
                          </p>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-purple-700/50 flex items-center justify-center text-purple-300 flex-shrink-0">
                            2
                          </div>
                          <p className="text-sm text-purple-300">
                            Puedes participar con hasta el 70% del valor del NFT en tokens PIROT.
                          </p>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-purple-700/50 flex items-center justify-center text-purple-300 flex-shrink-0">
                            3
                          </div>
                          <p className="text-sm text-purple-300">
                            Cuantos más tokens aportes, mayores serán tus probabilidades de ganar.
                          </p>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-purple-700/50 flex items-center justify-center text-purple-300 flex-shrink-0">
                            4
                          </div>
                          <p className="text-sm text-purple-300">
                            Si ganas, el NFT se transferirá automáticamente a tu wallet.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="py-10 px-4 border-t border-purple-800/50 bg-purple-950/50">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h2 className="text-2xl font-[Pirata One] text-yellow-400 flex items-center">
                <Skull className="mr-2 h-6 w-6" />
                Pirot
              </h2>
              <p className="text-purple-400 text-sm mt-1">La mejor dApp pirata en Ethereum (Sepolia)</p>
            </div>

            <div className="flex gap-6">
              <a href="#" className="text-purple-300 hover:text-yellow-400 transition-colors">
                Documentación
              </a>
              <a href="#" className="text-purple-300 hover:text-yellow-400 transition-colors">
                Discord
              </a>
              <a href="#" className="text-purple-300 hover:text-yellow-400 transition-colors">
                Twitter
              </a>
            </div>
          </div>
        </footer>
        {/* Transfer Modal */}
        <TransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          onTransfer={transferToken}
          balance={balance}
          loroRojoBalance={loroRojoBalance}
          loroMoradoBalance={loroMoradoBalance}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
