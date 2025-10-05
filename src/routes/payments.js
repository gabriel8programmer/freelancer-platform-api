// routes/payments.js
import express from 'express'
import { body, validationResult } from 'express-validator'
import { protect } from '../middleware/auth.js'
import Payment from '../models/Payment.js'
import Project from '../models/Project.js'
import User from '../models/User.js'

const router = express.Router()

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Criar novo pagamento
 *     description: Cliente cria um pagamento para um projeto (apenas clientes)
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - amount
 *               - paymentMethod
 *               - description
 *             properties:
 *               projectId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               amount:
 *                 type: number
 *                 example: 3500
 *               paymentMethod:
 *                 type: string
 *                 enum: [credit_card, debit_card, pix, bank_transfer, paypal]
 *                 example: "pix"
 *               description:
 *                 type: string
 *                 example: "Pagamento referente ao desenvolvimento do site"
 *               dueDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-31"
 *               installment:
 *                 type: object
 *                 properties:
 *                   current:
 *                     type: number
 *                     example: 1
 *                   total:
 *                     type: number
 *                     example: 3
 *     responses:
 *       201:
 *         description: Pagamento criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Apenas clientes podem criar pagamentos
 *       404:
 *         description: Projeto não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.post(
	'/',
	protect,
	[
		body('projectId').notEmpty().withMessage('ID do projeto é obrigatório'),
		body('amount')
			.isNumeric()
			.withMessage('Valor deve ser um número')
			.isFloat({ min: 1 })
			.withMessage('Valor deve ser maior que 0'),
		body('paymentMethod')
			.isIn(['credit_card', 'debit_card', 'pix', 'bank_transfer', 'paypal'])
			.withMessage('Método de pagamento inválido'),
		body('description').notEmpty().withMessage('Descrição é obrigatória'),
		body('dueDate').optional().isISO8601().withMessage('Data de vencimento inválida'),
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

			// Verificar se é cliente
			if (req.user.userType !== 'client') {
				return res.status(403).json({
					message: 'Apenas clientes podem criar pagamentos',
				})
			}

			const { projectId, amount, paymentMethod, description, dueDate, installment } = req.body

			// Buscar projeto
			const project = await Project.findById(projectId).populate('assignedTo', 'name email')

			if (!project) {
				return res.status(404).json({
					message: 'Projeto não encontrado',
				})
			}

			// Verificar se o cliente é dono do projeto
			if (project.client.toString() !== req.user._id.toString()) {
				return res.status(403).json({
					message: 'Apenas o cliente dono do projeto pode criar pagamentos',
				})
			}

			// Verificar se projeto tem freelancer atribuído
			if (!project.assignedTo) {
				return res.status(400).json({
					message: 'Projeto não tem freelancer atribuído',
				})
			}

			// Criar pagamento
			const payment = await Payment.create({
				project: projectId,
				client: req.user._id,
				freelancer: project.assignedTo._id,
				amount,
				paymentMethod,
				description,
				dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias padrão
				installment: installment || { current: 1, total: 1 },
			})

			// Popular dados para resposta
			const populatedPayment = await Payment.findById(payment._id)
				.populate('project', 'title')
				.populate('freelancer', 'name email')

			res.status(201).json(populatedPayment)
		} catch (error) {
			console.error('Erro ao criar pagamento:', error)
			res.status(500).json({
				message: 'Erro interno do servidor',
			})
		}
	},
)

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Listar pagamentos do usuário
 *     description: Retorna pagamentos relacionados ao usuário logado
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, refunded, cancelled]
 *         description: Filtrar por status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Lista de pagamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', protect, async (req, res) => {
	try {
		const { status, page = 1, limit = 10 } = req.query

		let query = {}

		// Filtrar por usuário (cliente ou freelancer)
		if (req.user.userType === 'client') {
			query.client = req.user._id
		} else {
			query.freelancer = req.user._id
		}

		// Filtrar por status se fornecido
		if (status) {
			query.status = status
		}

		const payments = await Payment.find(query)
			.populate('project', 'title')
			.populate(req.user.userType === 'client' ? 'freelancer' : 'client', 'name email avatar')
			.sort({ createdAt: -1 })
			.limit(limit * 1)
			.skip((page - 1) * limit)

		const total = await Payment.countDocuments(query)

		res.json({
			payments,
			totalPages: Math.ceil(total / limit),
			currentPage: parseInt(page),
			total,
		})
	} catch (error) {
		console.error('Erro ao buscar pagamentos:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
})

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Buscar pagamento por ID
 *     description: Retorna detalhes de um pagamento específico
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados do pagamento
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       403:
 *         description: Acesso não autorizado
 *       404:
 *         description: Pagamento não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/:id', protect, async (req, res) => {
	try {
		const payment = await Payment.findById(req.params.id)
			.populate('project', 'title description')
			.populate('client', 'name email avatar company')
			.populate('freelancer', 'name email avatar title')

		if (!payment) {
			return res.status(404).json({
				message: 'Pagamento não encontrado',
			})
		}

		// Verificar se usuário tem acesso ao pagamento
		const hasAccess =
			payment.client._id.toString() === req.user._id.toString() ||
			payment.freelancer._id.toString() === req.user._id.toString()

		if (!hasAccess) {
			return res.status(403).json({
				message: 'Acesso não autorizado a este pagamento',
			})
		}

		res.json(payment)
	} catch (error) {
		console.error('Erro ao buscar pagamento:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
})

/**
 * @swagger
 * /api/payments/{id}/process:
 *   post:
 *     summary: Processar pagamento (simulado)
 *     description: Simula o processamento de um pagamento (apenas para desenvolvimento)
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transactionId:
 *                 type: string
 *                 example: "txn_123456789"
 *     responses:
 *       200:
 *         description: Pagamento processado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Pagamento não pode ser processado
 *       403:
 *         description: Apenas clientes podem processar pagamentos
 *       404:
 *         description: Pagamento não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/:id/process', protect, async (req, res) => {
	try {
		const { transactionId } = req.body

		// Verificar se é cliente
		if (req.user.userType !== 'client') {
			return res.status(403).json({
				message: 'Apenas clientes podem processar pagamentos',
			})
		}

		const payment = await Payment.findById(req.params.id)

		if (!payment) {
			return res.status(404).json({
				message: 'Pagamento não encontrado',
			})
		}

		// Verificar se o cliente é dono do pagamento
		if (payment.client.toString() !== req.user._id.toString()) {
			return res.status(403).json({
				message: 'Apenas o cliente dono pode processar este pagamento',
			})
		}

		// Verificar se pode ser processado
		if (payment.status !== 'pending') {
			return res.status(400).json({
				message: `Pagamento não pode ser processado. Status atual: ${payment.status}`,
			})
		}

		// Simular processamento
		payment.status = 'processing'
		await payment.save()

		// Simular delay de processamento
		setTimeout(async () => {
			try {
				const updatedPayment = await Payment.findById(payment._id)
				if (updatedPayment.status === 'processing') {
					// 90% de chance de sucesso, 10% de falha
					if (Math.random() > 0.1) {
						await updatedPayment.markAsPaid(transactionId || `txn_${Date.now()}`)
					} else {
						updatedPayment.status = 'failed'
						await updatedPayment.save()
					}
				}
			} catch (error) {
				console.error('Erro no processamento assíncrono:', error)
			}
		}, 2000)

		res.json({
			message: 'Pagamento em processamento...',
			payment,
		})
	} catch (error) {
		console.error('Erro ao processar pagamento:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
})

/**
 * @swagger
 * /api/payments/{id}/refund:
 *   post:
 *     summary: Solicitar reembolso
 *     description: Cliente solicita reembolso de um pagamento (apenas para pagamentos completos)
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Serviço não foi entregue conforme combinado"
 *     responses:
 *       200:
 *         description: Reembolso solicitado com sucesso
 *       400:
 *         description: Reembolso não pode ser processado
 *       403:
 *         description: Apenas clientes podem solicitar reembolsos
 *       404:
 *         description: Pagamento não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.post(
	'/:id/refund',
	protect,
	[body('reason').notEmpty().withMessage('Motivo do reembolso é obrigatório')],
	async (req, res) => {
		try {
			const errors = validationResult(req)
			if (!errors.isEmpty()) {
				return res.status(400).json({
					message: 'Dados inválidos',
					errors: errors.array(),
				})
			}

			const { reason } = req.body

			// Verificar se é cliente
			if (req.user.userType !== 'client') {
				return res.status(403).json({
					message: 'Apenas clientes podem solicitar reembolsos',
				})
			}

			const payment = await Payment.findById(req.params.id)

			if (!payment) {
				return res.status(404).json({
					message: 'Pagamento não encontrado',
				})
			}

			// Verificar se o cliente é dono do pagamento
			if (payment.client.toString() !== req.user._id.toString()) {
				return res.status(403).json({
					message: 'Apenas o cliente dono pode solicitar reembolso',
				})
			}

			// Verificar se pode ser reembolsado
			if (payment.status !== 'completed') {
				return res.status(400).json({
					message: 'Apenas pagamentos completos podem ser reembolsados',
				})
			}

			// Verificar se não passou muito tempo (30 dias)
			const daysSincePayment = (new Date() - payment.paidAt) / (1000 * 60 * 60 * 24)
			if (daysSincePayment > 30) {
				return res.status(400).json({
					message: 'Reembolso não permitido após 30 dias do pagamento',
				})
			}

			// Processar reembolso
			await payment.processRefund(reason)

			res.json({
				message: 'Reembolso processado com sucesso',
				payment,
			})
		} catch (error) {
			console.error('Erro ao processar reembolso:', error)
			res.status(500).json({
				message: 'Erro interno do servidor',
			})
		}
	},
)

/**
 * @swagger
 * /api/payments/stats:
 *   get:
 *     summary: Estatísticas de pagamento
 *     description: Retorna estatísticas de pagamento do usuário
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas de pagamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalEarnings:
 *                   type: number
 *                   description: Total ganho (apenas freelancers)
 *                 pendingPayments:
 *                   type: number
 *                 completedPayments:
 *                   type: number
 *                 overduePayments:
 *                   type: number
 *                 recentPayments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/stats', protect, async (req, res) => {
	try {
		let stats = {}

		if (req.user.userType === 'freelancer') {
			// Estatísticas para freelancer
			const [totalEarnings, pendingPayments, completedPayments, overduePayments, recentPayments] =
				await Promise.all([
					Payment.aggregate([
						{ $match: { freelancer: req.user._id, status: 'completed' } },
						{ $group: { _id: null, total: { $sum: '$amount' } } },
					]),
					Payment.countDocuments({ freelancer: req.user._id, status: 'pending' }),
					Payment.countDocuments({ freelancer: req.user._id, status: 'completed' }),
					Payment.countDocuments({
						freelancer: req.user._id,
						status: 'pending',
						dueDate: { $lt: new Date() },
					}),
					Payment.find({ freelancer: req.user._id })
						.populate('client', 'name avatar company')
						.populate('project', 'title')
						.sort({ createdAt: -1 })
						.limit(5),
				])

			stats = {
				totalEarnings: totalEarnings[0]?.total || 0,
				pendingPayments,
				completedPayments,
				overduePayments,
				recentPayments,
			}
		} else {
			// Estatísticas para cliente
			const [totalSpent, pendingPayments, completedPayments, recentPayments] = await Promise.all([
				Payment.aggregate([
					{ $match: { client: req.user._id, status: 'completed' } },
					{ $group: { _id: null, total: { $sum: '$amount' } } },
				]),
				Payment.countDocuments({ client: req.user._id, status: 'pending' }),
				Payment.countDocuments({ client: req.user._id, status: 'completed' }),
				Payment.find({ client: req.user._id })
					.populate('freelancer', 'name avatar title')
					.populate('project', 'title')
					.sort({ createdAt: -1 })
					.limit(5),
			])

			stats = {
				totalSpent: totalSpent[0]?.total || 0,
				pendingPayments,
				completedPayments,
				recentPayments,
			}
		}

		res.json(stats)
	} catch (error) {
		console.error('Erro ao buscar estatísticas:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
})

export default router
