import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Clock, CheckSquare, Target, TrendingUp, BarChart3, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <nav className="flex justify-between items-center mb-20">
          <div className="flex items-center space-x-2">
            <Clock className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">TimeFlow</span>
          </div>
          <div className="space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>

        <div className="text-center max-w-4xl mx-auto mb-20">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Master Your Time,
            <br />
            Achieve Your Goals
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A comprehensive productivity platform that helps you manage tasks, track habits,
            set goals, and make every moment count.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="text-lg">
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="text-lg">
                View Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
          <FeatureCard
            icon={<CheckSquare className="h-10 w-10 text-violet-500" />}
            title="Task Management"
            description="Organize your tasks with priorities, deadlines, and status tracking."
          />
          <FeatureCard
            icon={<Target className="h-10 w-10 text-emerald-500" />}
            title="Goal Tracking"
            description="Set and achieve long-term goals with milestone tracking and progress visualization."
          />
          <FeatureCard
            icon={<TrendingUp className="h-10 w-10 text-green-500" />}
            title="Habit Builder"
            description="Build lasting habits with streak tracking and daily reminders."
          />
          <FeatureCard
            icon={<Clock className="h-10 w-10 text-blue-500" />}
            title="Time Tracking"
            description="Track how you spend your time with detailed analytics and reports."
          />
          <FeatureCard
            icon={<BarChart3 className="h-10 w-10 text-purple-500" />}
            title="Analytics"
            description="Gain insights into your productivity with beautiful charts and metrics."
          />
          <FeatureCard
            icon={<Clock className="h-10 w-10 text-pink-500" />}
            title="Smart Reminders"
            description="Never miss important tasks with intelligent reminder notifications."
          />
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to boost your productivity?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of users who are already managing their time better.
          </p>
          <Link href="/auth/register">
            <Button size="lg" variant="secondary" className="text-lg">
              Get Started Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
