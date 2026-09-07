import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft, Mail, Clock, Shield, ArrowRight } from 'lucide-react';

export default function FreelancerPortalSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-lg"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-24 h-24 bg-emerald-100 rounded-full mb-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
            >
              <CheckCircle className="h-12 w-12 text-emerald-600" />
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-heading text-3xl font-bold text-primary-900"
          >
            Application Submitted!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-3 text-zinc-500 max-w-md mx-auto"
          >
            Thank you for joining our freelancer network. Our team has received your application and will review it shortly.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-10 bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Mail className="h-6 w-6 text-primary-900" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Confirmation Email</p>
              <p className="text-sm text-zinc-500 mt-1">
                We've sent a confirmation to the email you provided. Check your inbox for next steps.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Clock className="h-6 w-6 text-primary-900" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Review Timeline</p>
              <p className="text-sm text-zinc-500 mt-1">
                Our team typically reviews applications within 2-3 business days. We'll notify you of any updates.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Shield className="h-6 w-6 text-primary-900" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">What Happens Next</p>
              <p className="text-sm text-zinc-500 mt-1">
                We'll keep your details in our secure records. If your profile matches our requirements for any upcoming projects, we will reach out to you directly.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link
            to="/freelancer-portal"
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-900 text-white rounded-2xl font-semibold hover:bg-primary-800 active:bg-primary-950 transition-all duration-200 shadow-lg shadow-primary-900/25"
          >
            <ArrowLeft className="h-5 w-5" />
            Submit Another Profile
          </Link>


        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-center text-sm text-zinc-500"
        >
          Questions? Contact us at{' '}
          <a href="mailto:freelancers@rudhramenterprises.com" className="text-primary-900 hover:underline font-medium">
            freelancers@rudhramenterprises.com
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
}