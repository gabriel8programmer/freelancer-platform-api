// server.js
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import projectRoutes from './routes/projects.js'
import swaggerDocs from './config/swagger.js' // 👈 Nova importação

dotenv.config()

const app = express()

// Middlewares
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Conexão com MongoDB
mongoose
	.connect(process.env.MONGODB_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => console.log('✅ Conectado ao MongoDB Atlas'))
	.catch((err) => console.error('❌ Erro ao conectar com MongoDB:', err))

// Rotas
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/projects', projectRoutes)

// Rota de health check
app.get('/api/health', (req, res) => {
	res.status(200).json({
		message: '🚀 Freelancer Platform API está rodando!',
		timestamp: new Date().toISOString(),
	})
})

// server.js - Adicione isso antes de swaggerDocs(app)
console.log('📁 Carregando documentação Swagger...')
console.log('📁 Diretório base:', process.cwd())
console.log('📁 Arquivos de rotas:', './routes/*.js')

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
	console.log(`📚 Docs: http://localhost:${PORT}/api-docs`) // 👈 Log da documentação
})
