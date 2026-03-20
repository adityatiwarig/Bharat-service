# Government CRM - Complaint Management System

A comprehensive, production-ready complaint management platform for municipal governments. Enables citizens to report issues, track status, and allows workers and administrators to manage and resolve complaints efficiently.

## Features

### For Citizens
- **Report Complaints**: Submit detailed complaints with category, priority, and location
- **Track Status**: Real-time status tracking from submission through resolution
- **View Transparency**: See all submitted complaints and their progress
- **Dashboard**: Quick overview of all submitted complaints and KPIs

### For Field Workers
- **View Assignments**: See all assigned complaints with priority levels
- **Mobile-First Design**: Fully responsive interface for on-the-go work
- **Submit Updates**: Update complaint status and add resolution notes
- **Task Prioritization**: View complaints sorted by urgency

### For Administrators
- **Complaint Management**: View, filter, and manage all complaints
- **Analytics Dashboard**: Charts showing complaint trends and categories
- **User Management**: Manage citizens, workers, and other admin users
- **Advanced Filtering**: Filter by status, priority, ward, and more

### For Executive Leaders
- **Performance Dashboard**: High-level KPIs and metrics
- **Ward Comparison**: Compare performance across all wards
- **Trend Analysis**: 6-month trend charts and forecasting
- **Reports**: Generate comprehensive reports for stakeholder communication

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **State Management**: React Hooks + SWR
- **Icons**: Lucide React
- **Database**: Mock data (ready for Supabase integration)

## Project Structure

```
app/
├── page.tsx                 # Landing page with role selection
├── citizen/                 # Citizen dashboard routes
│   ├── page.tsx            # Dashboard
│   ├── submit/             # Submit complaint
│   ├── my-complaints/      # View complaints
│   └── tracker/            # Track status
├── worker/                  # Field worker routes
│   ├── page.tsx            # Dashboard
│   ├── assigned/           # View assignments
│   └── updates/            # Submit updates
├── admin/                   # Admin routes
│   ├── page.tsx            # Dashboard
│   ├── complaints/         # Manage complaints
│   ├── users/              # User management
│   └── analytics/          # Analytics
├── leader/                  # Executive routes
│   ├── page.tsx            # Dashboard
│   ├── reports/            # Reports
│   ├── trends/             # Trend analysis
│   └── ward-comparison/    # Ward metrics
├── layout.tsx              # Root layout
├── globals.css             # Global styles
└── not-found.tsx           # 404 page

components/
├── dashboard-layout.tsx    # Main layout wrapper
├── header.tsx              # Header component
├── sidebar.tsx             # Navigation sidebar
├── kpi-card.tsx            # KPI card component
├── complaint-card.tsx      # Complaint display card
└── ui/                     # shadcn/ui components

lib/
├── types.ts                # TypeScript interfaces
├── utils.ts                # Utility functions
└── mock-data.ts            # Sample data

scripts/
└── setup-db.sql            # Database schema (optional)
```

## Key Components

### Dashboard Layout
Provides consistent header, sidebar navigation, and responsive design across all dashboards.

### Complaint Card
Displays complaint information with status badges, priority indicators, and action buttons.

### KPI Card
Customizable metric cards with variants for different data types and trends.

### Sidebar Navigation
Role-based navigation that shows different menu items for each user type.

## Data Models

### Users
- Citizens: Report complaints
- Workers: Fix and update complaint status
- Admin: Manage system and users
- Leader: Strategic oversight

### Complaints
- Status: submitted → assigned → in_progress → resolved
- Priority: low, medium, high, urgent
- Categories: pothole, streetlight, water, waste, sanitation, other

### Wards
- Geographic divisions of the municipality
- Each ward has population data and complaint metrics

### KPI Metrics
- Daily complaint volume
- Resolution rates
- Average resolution time
- Pending complaints count

## Responsive Design

- Mobile-first approach (320px minimum)
- Tablet optimization (768px)
- Desktop full experience (1440px+)
- Touch-friendly interface

## Color System

- **Primary**: Government blue (#205)
- **Success**: Green (#10b981)
- **Warning**: Amber (#f59e0b)
- **Danger**: Red (#ef4444)
- **Neutral**: Gray scale

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd gov-crm
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Run the development server**
   ```bash
   pnpm dev
   ```

4. **Open in browser**
   Navigate to http://localhost:3000

## Demo Accounts

The system includes mock users for testing:

- **Citizen**: citizen@example.com / John Smith
- **Field Worker**: worker@example.com / Jane Doe
- **Administrator**: admin@example.com / Alice Johnson
- **Executive Leader**: leader@example.com / Bob Wilson

## Database Setup (Optional)

To use real database instead of mock data:

1. Set up Supabase project
2. Run the schema migration:
   ```bash
   pnpm exec ts-node scripts/setup-db.sql
   ```
3. Update `.env.local` with your database credentials
4. Modify data fetching in components

## Future Enhancements

- Real-time notifications
- User authentication with Auth.js
- Geolocation mapping with Leaflet
- Image upload with Vercel Blob
- Email notifications
- SMS alerts
- AI-powered complaint categorization
- Mobile app version
- API for third-party integrations

## Performance Optimizations

- Image optimization
- Code splitting
- Lazy loading of charts
- Memoized components
- Efficient data structures

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader friendly
- Semantic HTML structure
- Proper ARIA labels

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT License - Feel free to use and modify

## Support

For issues or questions, please create an issue in the repository or contact the development team.
