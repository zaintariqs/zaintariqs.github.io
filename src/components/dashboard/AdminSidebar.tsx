import { NavLink, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Bot, 
  Repeat, 
  Users, 
  Shield, 
  Wallet, 
  Receipt, 
  DollarSign,
  Activity,
  PieChart,
  ArrowDownUp,
  TrendingUp
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const adminMenuItems = [
  { 
    title: 'Overview', 
    url: '/dashboard', 
    icon: LayoutDashboard,
    description: 'Dashboard home'
  },
  { 
    title: 'Market Maker', 
    url: '/dashboard/market-maker', 
    icon: Bot,
    description: 'Bot configuration'
  },
  { 
    title: 'Uniswap Trading', 
    url: '/dashboard/uniswap', 
    icon: Repeat,
    description: 'Trading interface'
  },
  { 
    title: 'Crypto Exchange', 
    url: '/dashboard/crypto-exchange', 
    icon: ArrowDownUp,
    description: 'Convert crypto to USDT'
  },
  { 
    title: 'Whitelisting', 
    url: '/dashboard/whitelisting', 
    icon: Users,
    description: 'Manage whitelist'
  },
  { 
    title: 'Login Attempts', 
    url: '/dashboard/login-attempts', 
    icon: Shield,
    description: 'Security monitoring'
  },
  { 
    title: 'All Deposits', 
    url: '/dashboard/all-deposits', 
    icon: Wallet,
    description: 'Review deposits'
  },
  { 
    title: 'All Redemptions', 
    url: '/dashboard/all-redemptions', 
    icon: Receipt,
    description: 'Review redemptions'
  },
  { 
    title: 'Transaction Fees', 
    url: '/dashboard/fees', 
    icon: DollarSign,
    description: 'Fee overview'
  },
  { 
    title: 'My Activity', 
    url: '/dashboard/my-activity', 
    icon: Activity,
    description: 'Personal transactions'
  },
  { 
    title: 'User Balances', 
    url: '/dashboard/user-balances', 
    icon: PieChart,
    description: 'Token holder balances'
  },
  { 
    title: 'Trade History', 
    url: '/dashboard/trade-history', 
    icon: TrendingUp,
    description: 'Uniswap trade records'
  },
]

export function AdminSidebar() {
  const location = useLocation()
  const currentPath = location.pathname

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return currentPath === path
    }
    return currentPath.startsWith(path)
  }

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary' 
      : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'

  return (
    <Sidebar className="w-64">
      <SidebarContent className="mt-20">
        <SidebarGroup>
          <SidebarGroupLabel>
            Admin Panel
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/dashboard'}
                      className={getNavCls}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
