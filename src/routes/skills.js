// routes/skills.js
import express from 'express'
import { protect } from '../middleware/auth.js'
import User from '../models/User.js'

const router = express.Router()

/**
 * @swagger
 * /api/skills:
 *   get:
 *     summary: Listar todas as habilidades disponíveis
 *     description: Retorna uma lista de todas as habilidades usadas pelos freelancers
 *     tags: [Habilidades]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar habilidades
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista de habilidades
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 skills:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       count:
 *                         type: integer
 *                         description: Número de freelancers com esta habilidade
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', async (req, res) => {
	try {
		const { search, limit = 20 } = req.query

		const aggregation = [
			{ $match: { userType: 'freelancer', skills: { $exists: true, $ne: [] } } },
			{ $unwind: '$skills' },
			{
				$group: {
					_id: '$skills',
					count: { $sum: 1 },
				},
			},
			{ $sort: { count: -1 } },
			{ $limit: parseInt(limit) },
			{
				$project: {
					name: '$_id',
					count: 1,
					_id: 0,
				},
			},
		]

		// Adicionar filtro de busca se fornecido
		if (search) {
			aggregation.unshift({
				$match: {
					userType: 'freelancer',
					skills: { $regex: search, $options: 'i' },
				},
			})
		}

		const skills = await User.aggregate(aggregation)

		res.json({ skills })
	} catch (error) {
		console.error('Erro ao buscar habilidades:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
})

/**
 * @swagger
 * /api/skills/popular:
 *   get:
 *     summary: Habilidades populares
 *     description: Retorna as habilidades mais populares entre freelancers
 *     tags: [Habilidades]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Lista de habilidades populares
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/popular', async (req, res) => {
	try {
		const { limit = 10 } = req.query

		const popularSkills = await User.aggregate([
			{ $match: { userType: 'freelancer', skills: { $exists: true, $ne: [] } } },
			{ $unwind: '$skills' },
			{
				$group: {
					_id: '$skills',
					count: { $sum: 1 },
				},
			},
			{ $sort: { count: -1 } },
			{ $limit: parseInt(limit) },
			{
				$project: {
					name: '$_id',
					count: 1,
					_id: 0,
				},
			},
		])

		res.json({ skills: popularSkills })
	} catch (error) {
		console.error('Erro ao buscar habilidades populares:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
})

export default router
