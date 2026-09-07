import mongoose from 'mongoose';
import Freelancer from './src/modules/freelancers/freelancer.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const freelancers = await Freelancer.find().sort({ createdAt: -1 }).limit(3);
  freelancers.forEach(f => {
    console.log(`ID: ${f._id}, Code: ${f.freelancerCode}, Name: ${f.fullName}, Email: "${f.email}"`);
  });
  process.exit(0);
}
run();
