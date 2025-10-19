// routes/auth.js
import express from 'express'
import { body, validationResult } from 'express-validator'
import User from '../models/User.js'
import { authenticateToken, generateToken } from '../middleware/auth.js'
import { getMe, login, logout, refreshToken } from '../controllers/authController.js'

import jwt from 'jsonwebtoken'

const router = express.Router()

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar novo usuário
 *     description: Cria uma nova conta de usuário na plataforma
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - userType
 *             properties:
 *               name:
 *                 type: string
 *                 example: "João Silva"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@email.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "123456"
 *               userType:
 *                 type: string
 *                 enum: [freelancer, client]
 *                 example: "freelancer"
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Dados inválidos ou usuário já existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno do servidor
 */
router.post(
	'/register',
	[
		body('name').notEmpty().withMessage('Nome é obrigatório'),
		body('email').isEmail().withMessage('Email inválido'),
		body('password').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
		body('userType').isIn(['freelancer', 'client']).withMessage('Tipo de usuário inválido'),
	],
	async (req, res) => {
		try {
			const errors = validationResult(req)
			if (!errors.isEmpty()) {
				return res.status(400).json({
					message: 'Dados inválidos',
					errors: errors.array(),
				})
			}

			const { name, email, password, userType } = req.body

			const userExists = await User.findOne({ email })
			if (userExists) {
				return res.status(400).json({
					message: 'Usuário já existe com este email',
				})
			}

			const user = await User.create({
				name,
				email,
				password,
				userType,
				loginType: 'email',
			})

			// Gera tokens
			const { accessToken, refreshToken } = generateTokens(user._id)

			// Configura cookie do refresh token
			res.cookie('refreshToken', refreshToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict',
				maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
			})

			res.status(201).json({
				message: 'Usuário criado com sucesso',
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
			console.error('Erro no registro:', error)
			res.status(500).json({
				message: 'Erro interno do servidor',
			})
		}
	},
)

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login do usuário
 *     description: Autentica um usuário com email e senha
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@email.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Credenciais inválidas
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro interno do servidor
 */
router.post(
	'/login',
	[
		body('email').isEmail().withMessage('Email inválido'),
		body('password').notEmpty().withMessage('Senha é obrigatória'),
	],
	login, // ← Usando o controller atualizado
)

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Gera um novo access token usando o refresh token
 *     tags: [Autenticação]
 *     responses:
 *       200:
 *         description: Novo access token gerado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     userType:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                     profileComplete:
 *                       type: boolean
 *       401:
 *         description: Refresh token não fornecido ou inválido
 *       403:
 *         description: Refresh token expirado
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/refresh-token', refreshToken)

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout do usuário
 *     description: Remove o refresh token e faz logout
 *     tags: [Autenticação]
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logout realizado com sucesso"
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/logout', logout)

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Login com Google
 *     description: Autentica um usuário usando conta do Google (simulado)
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 example: "João Silva"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@gmail.com"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro interno do servidor
 */
router.post(
	'/google',
	[
		body('email').isEmail().withMessage('Email inválido'),
		body('name').notEmpty().withMessage('Nome é obrigatório'),
	],
	async (req, res) => {
		try {
			const errors = validationResult(req)
			if (!errors.isEmpty()) {
				return res.status(400).json({
					message: 'Dados inválidos',
					errors: errors.array(),
				})
			}

			const { name, email } = req.body

			let user = await User.findOne({ email })

			if (!user) {
				user = await User.create({
					name,
					email,
					userType: 'freelancer',
					loginType: 'google',
					profileComplete: false,
				})
			}

			// Gera tokens para login com Google
			const { accessToken, refreshToken } = generateTokens(user._id)

			// Configura cookie do refresh token
			res.cookie('refreshToken', refreshToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict',
				maxAge: 7 * 24 * 60 * 60 * 1000,
			})

			res.json({
				message: 'Login com Google realizado com sucesso',
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
			console.error('Erro no login com Google:', error)
			res.status(500).json({
				message: 'Erro interno do servidor',
			})
		}
	},
)

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Buscar dados do usuário logado
 *     description: Retorna os dados do usuário autenticado
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/me', authenticateToken, getMe) // ← Agora protegida

// Função auxiliar para gerar tokens (reutilizada)
const generateTokens = (userId) => {
	const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
		expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
	})

	const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
		expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
	})

	return { accessToken, refreshToken }
}

export default router
