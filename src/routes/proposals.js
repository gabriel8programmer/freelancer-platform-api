// routes/proposals.js
import express from 'express'
import { protect } from '../middleware/auth.js'
import Project from '../models/Project.js'

const router = express.Router()

/**
 * @swagger
 * /api/proposals/my-proposals:
 *   get:
 *     summary: Buscar minhas propostas
 *     description: Retorna todas as propostas enviadas pelo freelancer logado
 *     tags: [Propostas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, rejected]
 *         description: Filtrar por status da proposta
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
 *         description: Lista de propostas do usuário
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 proposals:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       project:
 *                         $ref: '#/components/schemas/Project'
 *                       proposal:
 *                         type: string
 *                       bid:
 *                         type: number
 *                       timeline:
 *                         type: string
 *                       status:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/my-proposals', protect, async (req, res) => {
	try {
		const { status, page = 1, limit = 10 } = req.query

		// Verificar se é freelancer
		if (req.user.userType !== 'freelancer') {
			return res.status(403).json({
				message: 'Apenas freelancers podem acessar esta rota',
			})
		}

		let matchQuery = {
			'proposals.freelancer': req.user._id,
		}

		if (status) {
			matchQuery['proposals.status'] = status
		}

		const projects = await Project.aggregate([
			{ $match: matchQuery },
			{ $unwind: '$proposals' },
			{ $match: { 'proposals.freelancer': req.user._id } },
			{ $sort: { 'proposals.createdAt': -1 } },
			{ $skip: (page - 1) * limit },
			{ $limit: parseInt(limit) },
			{
				$lookup: {
					from: 'users',
					localField: 'client',
					foreignField: '_id',
					as: 'clientInfo',
				},
			},
			{
				$project: {
					_id: '$proposals._id',
					project: {
						_id: '$_id',
						title: '$title',
						description: '$description',
						budget: '$budget',
						category: '$category',
						status: '$status',
						client: { $arrayElemAt: ['$clientInfo', 0] },
					},
					proposal: '$proposals.proposal',
					bid: '$proposals.bid',
					timeline: '$proposals.timeline',
					status: '$proposals.status',
					createdAt: '$proposals.createdAt',
				},
			},
		])

		// Contar total
		const totalMatchQuery = {
			'proposals.freelancer': req.user._id,
		}
		if (status) {
			totalMatchQuery['proposals.status'] = status
		}

		const totalProjects = await Project.aggregate([
			{ $match: totalMatchQuery },
			{ $unwind: '$proposals' },
			{ $match: { 'proposals.freelancer': req.user._id } },
			{ $count: 'total' },
		])

		const total = totalProjects[0]?.total || 0

		res.json({
			proposals: projects,
			totalPages: Math.ceil(total / limit),
			currentPage: parseInt(page),
			total,
		})
	} catch (error) {
		console.error('Erro ao buscar propostas:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
})

/**
 * @swagger
 * /api/projects/{id}/proposals/{proposalId}:
 *   put:
 *     summary: Aceitar/recusar proposta
 *     description: Cliente aceita ou recusa uma proposta específica
 *     tags: [Propostas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: proposalId
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
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, reject]
 *                 example: "accept"
 *     responses:
 *       200:
 *         description: Proposta atualizada com sucesso
 *       400:
 *         description: Ação inválida ou proposta não encontrada
 *       403:
 *         description: Apenas o cliente dono pode gerenciar propostas
 *       404:
 *         description: Projeto não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/projects/:id/proposals/:proposalId', protect, async (req, res) => {
	try {
		const { action } = req.body
		const { id: projectId, proposalId } = req.params

		if (!['accept', 'reject'].includes(action)) {
			return res.status(400).json({
				message: 'Ação inválida. Use "accept" ou "reject"',
			})
		}

		const project = await Project.findById(projectId)

		if (!project) {
			return res.status(404).json({
				message: 'Projeto não encontrado',
			})
		}

		// Verificar se é o cliente dono
		if (project.client.toString() !== req.user._id.toString()) {
			return res.status(403).json({
				message: 'Apenas o cliente dono do projeto pode gerenciar propostas',
			})
		}

		// Encontrar a proposta
		const proposal = project.proposals.id(proposalId)
		if (!proposal) {
			return res.status(404).json({
				message: 'Proposta não encontrada',
			})
		}

		// Atualizar status da proposta
		proposal.status = action === 'accept' ? 'accepted' : 'rejected'

		// Se aceitou, atribuir projeto ao freelancer
		if (action === 'accept') {
			project.assignedTo = proposal.freelancer
			project.status = 'in_progress'

			// Rejeitar outras propostas
			project.proposals.forEach((p) => {
				if (p._id.toString() !== proposalId && p.status === 'pending') {
					p.status = 'rejected'
				}
			})
		}

		await project.save()

		res.json({
			message: `Proposta ${action === 'accept' ? 'aceita' : 'recusada'} com sucesso`,
		})
	} catch (error) {
		console.error('Erro ao atualizar proposta:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
})

export default router
