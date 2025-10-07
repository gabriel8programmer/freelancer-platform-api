// server.js - Atualize as importações
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'

// Rotas existentes
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import projectRoutes from './routes/projects.js'
import proposalRoutes from './routes/proposals.js'
import reviewRoutes from './routes/reviews.js'
import dashboardRoutes from './routes/dashboard.js'
import skillRoutes from './routes/skills.js'
import paymentRoutes from './routes/payments.js'

import swaggerDocs from './config/swagger.js'

dotenv.config()

const app = express()

// Middlewares
app.use(
  cors({
    origin: function (origin, callback) {
      // Permite requests sem origin (como mobile apps ou postman)
      if (!origin) return callback(null, true)

      // Lista de origens permitidas
      const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:5173',
        'https://localhost:3000',
        'https://localhost:5173',
      ]

      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        origin.includes('localhost')
      ) {
        callback(null, true)
      } else {
        callback(new Error('Não permitido por CORS'))
      }
    },
    credentials: true, // Se estiver usando cookies/tokens
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Conexão com MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ Conectado ao MongoDB Atlas'))
  .catch(err => console.error('❌ Erro ao conectar com MongoDB:', err))

// Rotas
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/proposals', proposalRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/skills', skillRoutes)
app.use('/api/payments', paymentRoutes)

// Rota de health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    message: '🚀 Freelancer Platform API está rodando!',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  })
})

// ✅ Inicializar documentação Swagger
swaggerDocs(app)

// Middleware de erro
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Algo deu errado!' })
})

// Rota não encontrada
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🎯 Servidor rodando na porta ${PORT}`)
  console.log(`📱 Ambiente: ${process.env.NODE_ENV}`)
  console.log(`📚 Docs: http://localhost:${PORT}/api-docs`)
  console.log(`🚀 Health: http://localhost:${PORT}/api/health`)
})
