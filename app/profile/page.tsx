'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useStore } from '@/lib/store';
import { MainLayout } from '@/components/layout/main-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { LevelBadge } from '@/components/gamification/level-badge';
import { XPProgress } from '@/components/gamification/xp-progress';
import { AchievementCard } from '@/components/gamification/achievement-card';
import { getLevelInfo } from '@/lib/gamification';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit2,
  Save,
  X,
  Camera,
  Briefcase,
  Globe,
  Shield,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ProfileContent />
      </MainLayout>
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { userData, updateUserData } = useAuth();
  const { tasks, goals, habits, gamification } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: userData?.name || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    location: userData?.location || '',
    bio: userData?.bio || '',
    company: userData?.company || '',
    website: userData?.website || '',
    avatar: userData?.avatar || '',
  });

  // Calculate actual statistics
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const activeGoals = goals.filter((g) => g.progress < 100).length;
  const totalHabits = habits.length;

  // Calculate longest streak across all habits
  const longestStreak = habits.length > 0
    ? Math.max(...habits.map((h) => h.longestStreak || 0))
    : 0;

  const handleSave = async () => {
    try {
      await updateUserData(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: userData?.name || '',
      email: userData?.email || '',
      phone: userData?.phone || '',
      location: userData?.location || '',
      bio: userData?.bio || '',
      company: userData?.company || '',
      website: userData?.website || '',
      avatar: userData?.avatar || '',
    });
    setIsEditing(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information and preferences
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="gap-2">
            <Edit2 className="h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
            <Button onClick={handleCancel} variant="outline" className="gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>Update your profile photo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-32 w-32 ring-4 ring-primary/20">
                  <AvatarImage src={formData.avatar} alt={formData.name} />
                  <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                    {formData.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full h-10 w-10 shadow-lg"
                  >
                    <Camera className="h-5 w-5" />
                  </Button>
                )}
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-semibold text-xl">{formData.name || 'Guest User'}</h3>
                <p className="text-sm text-muted-foreground">{formData.email}</p>
                <Badge variant="secondary" className="mt-2">
                  <Shield className="h-3 w-3 mr-1" />
                  Premium Member
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Joined {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              {formData.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{formData.location}</span>
                </div>
              )}
              {formData.company && (
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{formData.company}</span>
                </div>
              )}
              {formData.website && (
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={formData.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {formData.website}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details and bio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted rounded-md">{formData.name || 'Not set'}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="your.email@example.com"
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted rounded-md">{formData.email || 'Not set'}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted rounded-md">{formData.phone || 'Not set'}</p>
                )}
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                {isEditing ? (
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="City, Country"
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted rounded-md">{formData.location || 'Not set'}</p>
                )}
              </div>

              {/* Company */}
              <div className="space-y-2">
                <Label htmlFor="company" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Company
                </Label>
                {isEditing ? (
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    placeholder="Your company name"
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted rounded-md">{formData.company || 'Not set'}</p>
                )}
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website
                </Label>
                {isEditing ? (
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://yourwebsite.com"
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted rounded-md">{formData.website || 'Not set'}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              {isEditing ? (
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="resize-none"
                />
              ) : (
                <p className="text-sm p-3 bg-muted rounded-md min-h-[100px]">
                  {formData.bio || 'No bio added yet'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Tasks Completed</CardDescription>
            <CardTitle className="text-3xl">{completedTasks}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Goals</CardDescription>
            <CardTitle className="text-3xl">{activeGoals}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Habits Tracked</CardDescription>
            <CardTitle className="text-3xl">{totalHabits}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Best Streak</CardDescription>
            <CardTitle className="text-3xl">{longestStreak}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
