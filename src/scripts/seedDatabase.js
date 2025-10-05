// scripts/seedDatabase.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Project from '../models/Project.js'
import Review from '../models/Review.js'
import Payment from '../models/Payment.js'
import bcrypt from 'bcryptjs'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/freelancer-platform'

// Dados fictícios
const skillsPool = [
	'JavaScript',
	'TypeScript',
	'React',
	'Vue.js',
	'Angular',
	'Node.js',
	'Python',
	'Django',
	'Flask',
	'Java',
	'Spring Boot',
	'PHP',
	'Laravel',
	'WordPress',
	'HTML',
	'CSS',
	'SASS',
	'Tailwind CSS',
	'UI/UX Design',
	'Figma',
	'Adobe XD',
	'Mobile Development',
	'React Native',
	'Flutter',
	'Swift',
	'Kotlin',
	'Database Design',
	'MySQL',
	'PostgreSQL',
	'MongoDB',
	'Redis',
	'DevOps',
	'Docker',
	'AWS',
	'Azure',
	'Google Cloud',
	'CI/CD',
	'Git',
	'REST API',
	'GraphQL',
	'Microservices',
	'Machine Learning',
	'Data Science',
	'SEO',
	'Digital Marketing',
	'Content Writing',
	'Translation',
	'Social Media',
	'Video Editing',
	'Photo Editing',
]

const projectTitles = [
	'Desenvolvimento de Site Institucional',
	'Aplicativo Mobile para Delivery',
	'Sistema de Gestão Empresarial',
	'Loja Virtual E-commerce',
	'Plataforma de Cursos Online',
	'Dashboard Analytics',
	'Redesign de Interface',
	'API REST para Integração',
	'Chatbot com IA',
	'Sistema de Agendamento',
	'App para Fitness',
	'Portal de Notícias',
	'Sistema de Reservas',
	'Marketplace Digital',
	'App Financeiro Pessoal',
]

const projectDescriptions = [
	'Preciso de um sistema completo para gerenciar minha empresa, incluindo módulos de vendas, estoque e financeiro.',
	'Desenvolvimento de aplicativo mobile para plataformas iOS e Android com integração de pagamento.',
	'Site responsivo e moderno para apresentação da empresa e captação de leads.',
	'Loja virtual completa com carrinho de compras, checkout e integração com correios.',
	'Plataforma de ensino a distância com vídeos, quizzes e certificados.',
	'Dashboard interativo para visualização de métricas e KPIs do negócio.',
	'Redesign completo da interface para melhorar experiência do usuário e conversões.',
	'API robusta para integração com sistemas terceiros e parceiros.',
	'Chatbot inteligente para atendimento ao cliente 24/7.',
	'Sistema de agendamento online com confirmação automática.',
	'Aplicativo para acompanhamento de exercícios e dieta.',
	'Portal de notícias com sistema de assinaturas e comentários.',
	'Sistema de reservas para restaurante/hotel com confirmação.',
	'Marketplace conectando prestadores de serviço com clientes.',
	'App para controle de gastos e investimentos pessoais.',
]

class DatabaseSeeder {
	constructor() {
		this.users = []
		this.projects = []
		this.reviews = []
		this.payments = []
	}

	async connect() {
		try {
			await mongoose.connect(MONGODB_URI)
			console.log('✅ Conectado ao MongoDB')
		} catch (error) {
			console.error('❌ Erro ao conectar:', error)
			process.exit(1)
		}
	}

	async disconnect() {
		await mongoose.disconnect()
		console.log('✅ Conexão fechada')
	}

	async clearDatabase() {
		console.log('🧹 Limpando banco de dados...')
		await User.deleteMany({})
		await Project.deleteMany({})
		await Review.deleteMany({})
		await Payment.deleteMany({})
		console.log('✅ Banco de dados limpo')
	}

	// Gerar dados aleatórios
	getRandomItem(array) {
		return array[Math.floor(Math.random() * array.length)]
	}

	getRandomItems(array, count) {
		const shuffled = [...array].sort(() => 0.5 - Math.random())
		return shuffled.slice(0, count)
	}

	getRandomDate(start, end) {
		return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
	}

	// Criar usuários
	async createUsers() {
		console.log('👥 Criando usuários...')

		const usersData = [
			// Freelancers
			{
				name: 'Ana Silva',
				email: 'ana.silva@email.com',
				password: '123456',
				userType: 'freelancer',
				title: 'Desenvolvedora Full Stack',
				bio: 'Desenvolvedora com 5 anos de experiência em React, Node.js e MongoDB. Apaixonada por criar soluções inovadoras.',
				hourlyRate: 85,
				skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'TypeScript'],
				location: 'São Paulo, SP',
				phone: '(11) 99999-0001',
				experience: 'senior',
				profileComplete: true,
			},
			{
				name: 'Carlos Santos',
				email: 'carlos.santos@email.com',
				password: '123456',
				userType: 'freelancer',
				title: 'Designer UI/UX',
				bio: 'Designer especializado em interfaces modernas e experiência do usuário. Trabalho com Figma e Adobe XD.',
				hourlyRate: 70,
				skills: ['UI/UX Design', 'Figma', 'Adobe XD', 'Prototipagem', 'Design System'],
				location: 'Rio de Janeiro, RJ',
				phone: '(21) 99999-0002',
				experience: 'pleno',
				profileComplete: true,
			},
			{
				name: 'Marina Oliveira',
				email: 'marina.oliveira@email.com',
				password: '123456',
				userType: 'freelancer',
				title: 'Desenvolvedora Mobile',
				bio: 'Especialista em desenvolvimento mobile com React Native. Já desenvolvi mais de 20 apps publicados.',
				hourlyRate: 95,
				skills: ['React Native', 'JavaScript', 'Mobile Development', 'Firebase', 'API Integration'],
				location: 'Belo Horizonte, MG',
				phone: '(31) 99999-0003',
				experience: 'senior',
				profileComplete: true,
			},
			{
				name: 'Pedro Costa',
				email: 'pedro.costa@email.com',
				password: '123456',
				userType: 'freelancer',
				title: 'Especialista em Marketing Digital',
				bio: 'Marketing digital com foco em SEO e mídias sociais. Ajudo empresas a aumentarem sua visibilidade online.',
				hourlyRate: 65,
				skills: ['SEO', 'Google Ads', 'Mídias Sociais', 'Analytics', 'Content Marketing'],
				location: 'Porto Alegre, RS',
				phone: '(51) 99999-0004',
				experience: 'pleno',
				profileComplete: true,
			},
			{
				name: 'Juliana Lima',
				email: 'juliana.lima@email.com',
				password: '123456',
				userType: 'freelancer',
				title: 'Desenvolvedora Front-end',
				bio: 'Front-end developer especializada em Vue.js e React. Crio interfaces responsivas e performáticas.',
				hourlyRate: 75,
				skills: ['Vue.js', 'React', 'JavaScript', 'CSS', 'Responsive Design'],
				location: 'Curitiba, PR',
				phone: '(41) 99999-0005',
				experience: 'pleno',
				profileComplete: true,
			},
			{
				name: 'Ricardo Almeida',
				email: 'ricardo.almeida@email.com',
				password: '123456',
				userType: 'freelancer',
				title: 'Back-end Developer',
				bio: 'Desenvolvedor back-end com expertise em Python e Django. Foco em APIs robustas e escaláveis.',
				hourlyRate: 80,
				skills: ['Python', 'Django', 'PostgreSQL', 'REST API', 'Docker'],
				location: 'Salvador, BA',
				phone: '(71) 99999-0006',
				experience: 'senior',
				profileComplete: true,
			},
			{
				name: 'Fernanda Rocha',
				email: 'fernanda.rocha@email.com',
				password: '123456',
				userType: 'freelancer',
				title: 'DevOps Engineer',
				bio: 'Engenheira de DevOps com experiência em AWS, Docker e CI/CD. Otimizo infraestrutura e deploy.',
				hourlyRate: 90,
				skills: ['DevOps', 'AWS', 'Docker', 'CI/CD', 'Linux'],
				location: 'Florianópolis, SC',
				phone: '(48) 99999-0007',
				experience: 'senior',
				profileComplete: true,
			},
			{
				name: 'Lucas Martins',
				email: 'lucas.martins@email.com',
				password: '123456',
				userType: 'freelancer',
				title: 'Full Stack Developer Jr',
				bio: 'Desenvolvedor júnior em busca de primeira oportunidade. Estudante de Ciência da Computação.',
				hourlyRate: 45,
				skills: ['JavaScript', 'React', 'Node.js', 'MySQL', 'Git'],
				location: 'Campinas, SP',
				phone: '(19) 99999-0008',
				experience: 'junior',
				profileComplete: true,
			},

			// Clientes
			{
				name: 'Tech Solutions Ltda',
				email: 'contato@techsolutions.com',
				password: '123456',
				userType: 'client',
				company: 'Tech Solutions',
				website: 'https://techsolutions.com',
				profileComplete: true,
			},
			{
				name: 'Inova Digital',
				email: 'projetos@inovadigital.com',
				password: '123456',
				userType: 'client',
				company: 'Inova Digital',
				website: 'https://inovadigital.com',
				profileComplete: true,
			},
			{
				name: 'Startup Fast',
				email: 'hello@startupfast.com',
				password: '123456',
				userType: 'client',
				company: 'Startup Fast',
				website: 'https://startupfast.com',
				profileComplete: true,
			},
			{
				name: 'E-commerce Brasil',
				email: 'contato@ecommercebrasil.com',
				password: '123456',
				userType: 'client',
				company: 'E-commerce Brasil',
				website: 'https://ecommercebrasil.com',
				profileComplete: true,
			},
			{
				name: 'Agência Criativa',
				email: 'projetos@agenciacriativa.com',
				password: '123456',
				userType: 'client',
				company: 'Agência Criativa',
				website: 'https://agenciacriativa.com',
				profileComplete: true,
			},
		]

		// Criar usuários com password hasheado
		for (const userData of usersData) {
			const hashedPassword = await bcrypt.hash(userData.password, 12)
			const user = new User({
				...userData,
				password: hashedPassword,
				avatar: userData.userType === 'freelancer' ? '👨‍💻' : '🏢',
			})
			await user.save()
			this.users.push(user)
		}

		console.log(`✅ ${this.users.length} usuários criados`)
	}

	// Criar projetos
	async createProjects() {
		console.log('📋 Criando projetos...')

		const clients = this.users.filter((user) => user.userType === 'client')
		const freelancers = this.users.filter((user) => user.userType === 'freelancer')

		const projectsData = []

		for (let i = 0; i < 25; i++) {
			const client = this.getRandomItem(clients)
			const title = this.getRandomItem(projectTitles)
			const description = this.getRandomItem(projectDescriptions)

			const minBudget = Math.floor(Math.random() * 2000) + 1000
			const maxBudget = minBudget + Math.floor(Math.random() * 3000) + 1000

			const project = new Project({
				title,
				description,
				client: client._id,
				budget: {
					min: minBudget,
					max: maxBudget,
					currency: 'BRL',
				},
				category: this.getRandomItem([
					'Desenvolvimento Web',
					'Design UI/UX',
					'Marketing Digital',
					'Redação',
					'Consultoria',
					'Outro',
				]),
				skills: this.getRandomItems(skillsPool, Math.floor(Math.random() * 5) + 3),
				timeline: `${Math.floor(Math.random() * 8) + 2} semanas`,
				status: 'open',
				createdAt: this.getRandomDate(new Date(2024, 0, 1), new Date()),
			})

			// Adicionar propostas para alguns projetos
			if (Math.random() > 0.3) {
				// 70% dos projetos têm propostas
				const numProposals = Math.floor(Math.random() * 5) + 1
				const proposalFreelancers = this.getRandomItems(freelancers, numProposals)

				for (const freelancer of proposalFreelancers) {
					project.proposals.push({
						freelancer: freelancer._id,
						proposal: `Tenho experiência com projetos similares e posso entregar um trabalho de qualidade dentro do prazo. Minha abordagem inclui ${this.getRandomItems(
							['design responsivo', 'código limpo', 'otimização SEO', 'testes automatizados'],
							2,
						).join(' e ')}.`,
						bid: Math.floor(Math.random() * (maxBudget - minBudget)) + minBudget,
						timeline: `${Math.floor(Math.random() * 4) + 2} semanas`,
						status: this.getRandomItem(['pending', 'accepted', 'rejected']),
					})
				}

				// Se há propostas aceitas, atribuir projeto
				const acceptedProposal = project.proposals.find((p) => p.status === 'accepted')
				if (acceptedProposal) {
					project.assignedTo = acceptedProposal.freelancer
					project.status = 'in_progress'
				}
			}

			await project.save()
			projectsData.push(project)
		}

		this.projects = projectsData
		console.log(`✅ ${this.projects.length} projetos criados`)
	}

	// Criar avaliações
	async createReviews() {
		console.log('⭐ Criando avaliações...')

		const completedProjects = this.projects.filter(
			(p) => p.status === 'in_progress' || Math.random() > 0.7,
		)

		for (const project of completedProjects) {
			if (project.assignedTo) {
				const freelancer = this.users.find((u) => u._id.equals(project.assignedTo))
				const client = this.users.find((u) => u._id.equals(project.client))

				if (freelancer && client) {
					// Avaliação do cliente para o freelancer
					const clientReview = new Review({
						project: project._id,
						reviewer: client._id,
						reviewed: freelancer._id,
						reviewType: 'client_to_freelancer',
						rating: Math.floor(Math.random() * 2) + 4, // 4-5 estrelas
						comment: this.getRandomItem([
							'Excelente trabalho! Profissional muito competente e dedicado.',
							'Superou minhas expectativas. Entregou antes do prazo e com qualidade excepcional.',
							'Muito bom profissional, comunicação clara e trabalho bem executado.',
							'Recomendo! Fez exatamente o que foi combinado e ainda deu ótimas sugestões.',
							'Trabalho impecável. Certamente contratarei novamente.',
						]),
					})
					await clientReview.save()
					this.reviews.push(clientReview)

					// Avaliação do freelancer para o cliente (50% chance)
					if (Math.random() > 0.5) {
						const freelancerReview = new Review({
							project: project._id,
							reviewer: freelancer._id,
							reviewed: client._id,
							reviewType: 'freelancer_to_client',
							rating: Math.floor(Math.random() * 2) + 4, // 4-5 estrelas
							comment: this.getRandomItem([
								'Cliente excelente, sabe exatamente o que quer e paga em dia.',
								'Ótima comunicação durante todo o projeto, muito profissional.',
								'Foi um prazer trabalhar neste projeto. Cliente muito claro em seus objetivos.',
								'Recomendo trabalhar com este cliente. Respeitoso e organizado.',
								'Processo muito tranquilo, pagamentos em dia e feedbacks construtivos.',
							]),
						})
						await freelancerReview.save()
						this.reviews.push(freelancerReview)
					}
				}
			}
		}

		console.log(`✅ ${this.reviews.length} avaliações criadas`)
	}

	// Criar pagamentos
	async createPayments() {
		console.log('💰 Criando pagamentos...')

		const assignedProjects = this.projects.filter((p) => p.assignedTo)

		for (const project of assignedProjects) {
			const acceptedProposal = project.proposals.find((p) => p.status === 'accepted')

			if (acceptedProposal) {
				const payment = new Payment({
					project: project._id,
					client: project.client,
					freelancer: project.assignedTo,
					amount: acceptedProposal.bid,
					currency: 'BRL',
					status: this.getRandomItem(['pending', 'completed', 'processing']),
					paymentMethod: this.getRandomItem(['credit_card', 'pix', 'bank_transfer']),
					description: `Pagamento referente ao projeto: ${project.title}`,
					dueDate: this.getRandomDate(new Date(), new Date(2024, 11, 31)),
					paidAt: Math.random() > 0.5 ? this.getRandomDate(new Date(2024, 0, 1), new Date()) : null,
				})

				await payment.save()
				this.payments.push(payment)
			}
		}

		console.log(`✅ ${this.payments.length} pagamentos criados`)
	}

	// Atualizar ratings dos usuários baseado nas reviews
	async updateUserRatings() {
		console.log('📊 Atualizando ratings dos usuários...')

		const usersWithReviews = await Review.aggregate([
			{
				$group: {
					_id: '$reviewed',
					averageRating: { $avg: '$rating' },
					totalReviews: { $sum: 1 },
				},
			},
		])

		for (const stats of usersWithReviews) {
			await User.findByIdAndUpdate(stats._id, {
				rating: Math.round(stats.averageRating * 10) / 10,
				completedProjects: stats.totalReviews,
			})
		}

		console.log(`✅ Ratings de ${usersWithReviews.length} usuários atualizados`)
	}

	async run() {
		try {
			await this.connect()
			await this.clearDatabase()

			await this.createUsers()
			await this.createProjects()
			await this.createReviews()
			await this.createPayments()
			await this.updateUserRatings()

			console.log('\n🎉 SEED COMPLETADO COM SUCESSO!')
			console.log('📊 RESUMO:')
			console.log(`   👥 Usuários: ${this.users.length}`)
			console.log(`   📋 Projetos: ${this.projects.length}`)
			console.log(`   ⭐ Avaliações: ${this.reviews.length}`)
			console.log(`   💰 Pagamentos: ${this.payments.length}`)
			console.log('\n🔗 URLs para teste:')
			console.log('   Frontend: http://localhost:3000')
			console.log('   API Docs: http://localhost:5000/api-docs')
			console.log('   Health: http://localhost:5000/api/health')
		} catch (error) {
			console.error('❌ Erro durante o seed:', error)
		} finally {
			await this.disconnect()
		}
	}
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
	const seeder = new DatabaseSeeder()
	seeder.run()
}

export default DatabaseSeeder
