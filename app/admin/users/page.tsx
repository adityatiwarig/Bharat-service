'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { users, wards } from '@/lib/mock-data';
import { UserRole } from '@/lib/types';
import { Search, Users as UsersIcon } from 'lucide-react';

const currentUser = users[2]; // admin user
const roles: UserRole[] = ['citizen', 'worker', 'admin', 'leader'];

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  let filtered = [...users];

  if (searchQuery) {
    filtered = filtered.filter(u =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (roleFilter !== 'all') {
    filtered = filtered.filter(u => u.role === roleFilter);
  }

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'citizen':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'worker':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'leader':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  return (
    <DashboardLayout
      title="User Management"
      userRole="admin"
      userName={currentUser.full_name}
    >
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {users.filter(u => u.role === 'citizen').length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Citizens</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {users.filter(u => u.role === 'worker').length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Field Workers</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.role === 'admin' || u.role === 'leader').length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Admin/Leader</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <FieldGroup>
                  <Field>
                    <FieldLabel className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Search Users
                    </FieldLabel>
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </Field>
                </FieldGroup>
              </div>
              <div className="w-full sm:w-48">
                <FieldGroup>
                  <Field>
                    <FieldLabel>Role</FieldLabel>
                    <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {roles.map(role => (
                          <SelectItem key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              Users ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 font-semibold">Role</th>
                      <th className="text-left py-3 px-4 font-semibold">Ward</th>
                      <th className="text-left py-3 px-4 font-semibold">Phone</th>
                      <th className="text-left py-3 px-4 font-semibold">Joined</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(user => {
                      const ward = user.ward_id ? wards.find(w => w.id === user.ward_id) : null;
                      const joinedDate = new Date(user.created_at).toLocaleDateString();

                      return (
                        <tr
                          key={user.id}
                          className="border-b border-border hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium">{user.full_name}</td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">{user.email}</td>
                          <td className="py-3 px-4">
                            <Badge className={getRoleBadgeVariant(user.role)}>
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {ward?.name || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {user.phone || '-'}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {joinedDate}
                          </td>
                          <td className="py-3 px-4">
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No users match your search</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
