// scripts/quickSeed.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import DatabaseSeeder from './seedDatabase.js'

dotenv.config()

async function quickSeed() {
	console.log('🚀 Iniciando seed rápido...')
	const seeder = new DatabaseSeeder()
	await seeder.run()
}

quickSeed().catch(console.error)
