// routes/auth.js
import express from 'express'
import { body, validationResult } from 'express-validator'
import User from '../models/User.js'
import { generateToken } from '../middleware/auth.js'

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

			if (user) {
				res.status(201).json({
					_id: user._id,
					name: user.name,
					email: user.email,
					avatar: user.avatar,
					userType: user.userType,
					profileComplete: user.profileComplete,
					token: generateToken(user._id),
				})
			}
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
	async (req, res) => {
		try {
			const errors = validationResult(req)
			if (!errors.isEmpty()) {
				return res.status(400).json({
					message: 'Dados inválidos',
					errors: errors.array(),
				})
			}

			const { email, password } = req.body

			const user = await User.findOne({ email }).select('+password')

			if (user && (await user.correctPassword(password, user.password))) {
				res.json({
					_id: user._id,
					name: user.name,
					email: user.email,
					avatar: user.avatar,
					userType: user.userType,
					profileComplete: user.profileComplete,
					token: generateToken(user._id),
				})
			} else {
				res.status(401).json({
					message: 'Email ou senha inválidos',
				})
			}
		} catch (error) {
			console.error('Erro no login:', error)
			res.status(500).json({
				message: 'Erro interno do servidor',
			})
		}
	},
)

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

			res.json({
				_id: user._id,
				name: user.name,
				email: user.email,
				avatar: user.avatar,
				userType: user.userType,
				profileComplete: user.profileComplete,
				token: generateToken(user._id),
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
router.get('/me', async (req, res) => {
	try {
		// Esta rota precisa do middleware de proteção
		res.json(req.user)
	} catch (error) {
		console.error('Erro ao buscar usuário:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
})

export default router
