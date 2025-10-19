// middleware/auth.js
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const protect = async (req, res, next) => {
	try {
		let token

		if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
			token = req.headers.authorization.split(' ')[1]
		}

		if (!token) {
			return res.status(401).json({
				message: 'Acesso negado. Token não fornecido.',
			})
		}

		// Verificar token
		const decoded = jwt.verify(token, process.env.JWT_SECRET)

		// Buscar usuário
		const user = await User.findById(decoded.id)
		if (!user) {
			return res.status(401).json({
				message: 'Token inválido. Usuário não existe.',
			})
		}

		req.user = user
		next()
	} catch (error) {
		return res.status(401).json({
			message: 'Token inválido.',
		})
	}
}

// Gerar JWT
export const generateToken = (id) => {
	return jwt.sign({ id }, process.env.JWT_SECRET, {
		expiresIn: '30d',
	})
}

// Middleware para verificar access token
export const authenticateToken = async (req, res, next) => {
	try {
		const authHeader = req.headers['authorization']
		const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

		if (!token) {
			return res.status(401).json({
				message: 'Access token não fornecido',
			})
		}

		// Verifica o token
		const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

		// Busca usuário no banco
		const user = await User.findById(decoded.userId).select('-password')
		if (!user) {
			return res.status(401).json({
				message: 'Usuário não encontrado',
			})
		}

		req.user = user
		next()
	} catch (error) {
		if (error.name === 'JsonWebTokenError') {
			return res.status(403).json({
				message: 'Token inválido',
			})
		}
		if (error.name === 'TokenExpiredError') {
			return res.status(403).json({
				message: 'Access token expirado',
				code: 'TOKEN_EXPIRED',
			})
		}

		console.error('Erro na autenticação:', error)
		return res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
}

// Middleware opcional (para rotas que podem ser acessadas com ou sem auth)
export const optionalAuth = async (req, res, next) => {
	try {
		const authHeader = req.headers['authorization']
		const token = authHeader && authHeader.split(' ')[1]

		if (token) {
			const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
			const user = await User.findById(decoded.userId).select('-password')
			req.user = user
		}

		next()
	} catch (error) {
		// Continua sem autenticação em caso de erro
		next()
	}
}
