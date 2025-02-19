import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "../ui/button";

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center min-h-screen justify-center bg-background text-foreground">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.h1
          initial={{ scale: 0.5 }}
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
          className="text-9xl font-bold"
        >
          404
        </motion.h1>
        <motion.p
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-xl mb-8"
        >
          {"Oops! The page you're looking for doesn't exist."}
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Link href="/">
          <Button variant="default" size="lg" className="font-semibold">
            Return to Home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
