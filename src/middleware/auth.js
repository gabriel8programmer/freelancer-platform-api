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
