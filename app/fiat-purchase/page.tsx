"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Coins, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Stripe, StripeCheckout } from "@/components/stripe"
import Link from "next/link"

export default function FiatPurchasePage() {
  const [showCheckout, setShowCheckout] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)

  const handleProductSelect = (product: string) => {
    setSelectedProduct(product)
    setShowCheckout(true)
  }

  return (
    <div className="min-h-screen bg-[#1a0f37] text-white">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center text-purple-300 hover:text-yellow-400 mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la página principal
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 font-[Pirata One] text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 text-center">
            Compra Tokens Pirot con Tarjeta
          </h1>
          <p className="text-xl text-purple-200 text-center mb-12">
            Adquiere tokens Pirot de forma rápida y segura con tu tarjeta de crédito o débito.
          </p>

          <Stripe>
            {showCheckout ? (
              <div className="max-w-md mx-auto">
                <Button
                  onClick={() => setShowCheckout(false)}
                  variant="outline"
                  className="mb-6 border-purple-500 text-purple-200 hover:bg-purple-800/30"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver a los paquetes
                </Button>
                <StripeCheckout />
              </div>
            ) : (
              <div>
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-[Pirata One] text-yellow-400 mb-4">Elige tu paquete de tokens</h2>
                  <p className="text-purple-300">
                    Selecciona el paquete que mejor se adapte a tus necesidades de navegación pirata.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-purple-900/50 backdrop-blur-md rounded-2xl p-6 border border-purple-700/50 shadow-lg cursor-pointer"
                    onClick={() => handleProductSelect("small")}
                  >
                    <h3 className="text-xl font-[Pirata One] mb-4 text-yellow-400">Paquete Básico</h3>
                    <p className="text-3xl font-bold text-white mb-2">
                      100 <span className="text-sm text-purple-300">Tokens</span>
                    </p>
                    <p className="text-purple-300 mb-4">Perfecto para comenzar tu aventura pirata.</p>
                    <Button className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-md font-medium">
                      <Coins className="mr-2 h-4 w-4" />
                      $10 USD
                    </Button>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-purple-900/50 backdrop-blur-md rounded-2xl p-6 border border-purple-700/50 shadow-lg cursor-pointer"
                    onClick={() => handleProductSelect("medium")}
                  >
                    <h3 className="text-xl font-[Pirata One] mb-4 text-yellow-400">Paquete Aventurero</h3>
                    <p className="text-3xl font-bold text-white mb-2">
                      500 <span className="text-sm text-purple-300">Tokens</span>
                    </p>
                    <p className="text-purple-300 mb-4">Para piratas con experiencia en los mares.</p>
                    <Button className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-md font-medium">
                      <Coins className="mr-2 h-4 w-4" />
                      $45 USD
                    </Button>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-purple-900/50 backdrop-blur-md rounded-2xl p-6 border border-purple-700/50 shadow-lg cursor-pointer"
                    onClick={() => handleProductSelect("large")}
                  >
                    <h3 className="text-xl font-[Pirata One] mb-4 text-yellow-400">Paquete Capitán</h3>
                    <p className="text-3xl font-bold text-white mb-2">
                      1000 <span className="text-sm text-purple-300">Tokens</span>
                    </p>
                    <p className="text-purple-300 mb-4">Domina los mares con este botín completo.</p>
                    <Button className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-md font-medium">
                      <Coins className="mr-2 h-4 w-4" />
                      $80 USD
                    </Button>
                  </motion.div>
                </div>
              </div>
            )}
          </Stripe>
        </motion.div>
      </div>
    </div>
  )
}
