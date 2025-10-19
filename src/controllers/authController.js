import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Gera tokens
const generateTokens = (userId) => {
	const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
		expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
	})

	const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
		expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
	})

	return { accessToken, refreshToken }
}

// Login
export const login = async (req, res) => {
	try {
		const { email, password } = req.body

		// Validação
		if (!email || !password) {
			return res.status(400).json({
				message: 'Email e senha são obrigatórios',
			})
		}

		// Busca usuário
		const user = await User.findOne({ email })
		if (!user) {
			return res.status(401).json({
				message: 'Credenciais inválidas',
			})
		}

		// Verifica senha (apenas para login por email)
		if (user.loginType === 'email') {
			const isPasswordValid = await user.correctPassword(password, user.password)
			if (!isPasswordValid) {
				return res.status(401).json({
					message: 'Credenciais inválidas',
				})
			}
		}

		// Gera tokens
		const { accessToken, refreshToken } = generateTokens(user._id)

		// Configura cookie do refresh token
		res.cookie('refreshToken', refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
		})

		// Retorna access token e dados do usuário
		res.json({
			message: 'Login realizado com sucesso',
			accessToken,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				userType: user.userType,
				avatar: user.avatar,
				profileComplete: user.profileComplete,
			},
		})
	} catch (error) {
		console.error('Erro no login:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
}

// Refresh Token
export const refreshToken = async (req, res) => {
	try {
		const refreshToken = req.cookies.refreshToken

		if (!refreshToken) {
			return res.status(401).json({
				message: 'Refresh token não fornecido',
			})
		}

		// Verifica refresh token
		const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)

		// Busca usuário
		const user = await User.findById(decoded.userId)
		if (!user) {
			return res.status(401).json({
				message: 'Usuário não encontrado',
			})
		}

		// Gera novo access token
		const accessToken = jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN_SECRET, {
			expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
		})

		res.json({
			accessToken,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				userType: user.userType,
				avatar: user.avatar,
				profileComplete: user.profileComplete,
			},
		})
	} catch (error) {
		if (error.name === 'JsonWebTokenError') {
			return res.status(403).json({
				message: 'Refresh token inválido',
			})
		}
		if (error.name === 'TokenExpiredError') {
			return res.status(403).json({
				message: 'Refresh token expirado',
			})
		}

		console.error('Erro no refresh token:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
}

// Logout
export const logout = (req, res) => {
	res.clearCookie('refreshToken', {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
	})

	res.json({
		message: 'Logout realizado com sucesso',
	})
}

// Meu perfil (rota protegida)
export const getMe = async (req, res) => {
	try {
		const user = await User.findById(req.user._id).select('-password')
		res.json(user)
	} catch (error) {
		console.error('Erro ao buscar perfil:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
}
