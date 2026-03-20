'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function Users() {
  const users = [
    { id: 1, name: 'Raj Kumar', role: 'Field Worker', email: 'raj.kumar@govcrm.com', ward: 'Ward 1', status: 'Active', complaints: 24 },
    { id: 2, name: 'Priya Singh', role: 'Field Worker', email: 'priya.singh@govcrm.com', ward: 'Ward 3', status: 'Active', complaints: 18 },
    { id: 3, name: 'Vikram Patel', role: 'Field Worker', email: 'vikram@govcrm.com', ward: 'Ward 4', status: 'Active', complaints: 31 },
    { id: 4, name: 'Amrita Desai', role: 'Ward Officer', email: 'amrita.desai@govcrm.com', ward: 'Ward 2', status: 'Active', complaints: 87 },
    { id: 5, name: 'Admin User', role: 'Administrator', email: 'admin@govcrm.com', ward: 'All', status: 'Active', complaints: 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">User Management</h2>
        <p className="text-muted-foreground mt-1">Manage system users and their roles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Users</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or email..." className="pl-8" />
          </div>
          <Button variant="outline">Filter</Button>
          <Button>Add User</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Total: {users.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Role</th>
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 font-semibold">Ward</th>
                  <th className="text-left py-3 px-4 font-semibold">Complaints Handled</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{user.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                    <td className="py-3 px-4">{user.ward}</td>
                    <td className="py-3 px-4">{user.complaints}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
