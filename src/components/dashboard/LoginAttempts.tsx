import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Monitor, MapPin, Calendar } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface LoginAttempt {
  id: string
  wallet_address: string
  fingerprint: string
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

interface LoginAttemptWithEmail extends LoginAttempt {
  email: string | null
}

export default function LoginAttempts() {
  const [loginAttempts, setLoginAttempts] = useState<LoginAttemptWithEmail[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchLoginAttempts = async () => {
    try {
      setLoading(true)
      
      // Fetch login attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from('login_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (attemptsError) {
        console.error('Error fetching login attempts:', attemptsError)
        toast({
          title: 'Error',
          description: 'Failed to load login attempts',
          variant: 'destructive'
        })
        return
      }

      // Fetch whitelist requests to get emails
      const { data: whitelist, error: whitelistError } = await supabase
        .functions.invoke('whitelist-requests')

      if (whitelistError) {
        console.error('Error fetching whitelist:', whitelistError)
      }

      // Create a map of wallet addresses to emails from whitelist
      const emailMap = new Map<string, string>()
      
      if (whitelist?.requests) {
        for (const request of whitelist.requests) {
          if (request.email && request.wallet_address) {
            emailMap.set(request.wallet_address.toLowerCase(), request.email)
          }
        }
      }

      // Merge login attempts with emails
      const attemptsWithEmails: LoginAttemptWithEmail[] = (attempts || []).map(attempt => ({
        ...attempt,
        email: emailMap.get(attempt.wallet_address.toLowerCase()) || null
      }))

      setLoginAttempts(attemptsWithEmails)
    } catch (error) {
      console.error('Error in fetchLoginAttempts:', error)
      toast({
        title: 'Error',
        description: 'Failed to load login attempts',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLoginAttempts()
  }, [])

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatFingerprint = (fp: string) => {
    return `${fp.slice(0, 8)}...${fp.slice(-8)}`
  }

  if (loading) {
    return (
      <Card className="bg-crypto-dark border-crypto-gray">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-crypto-green" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-crypto-dark border-crypto-gray">
      <CardHeader>
        <CardTitle className="text-white">Login Attempts</CardTitle>
        <CardDescription className="text-gray-400">
          Track user login activity with digital fingerprints and IP addresses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-crypto-gray hover:bg-crypto-gray/50">
                <TableHead className="text-gray-300">Wallet Address</TableHead>
                <TableHead className="text-gray-300">Email</TableHead>
                <TableHead className="text-gray-300">Fingerprint</TableHead>
                <TableHead className="text-gray-300">IP Address</TableHead>
                <TableHead className="text-gray-300">User Agent</TableHead>
                <TableHead className="text-gray-300">Date/Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loginAttempts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                    No login attempts recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                loginAttempts.map((attempt) => (
                  <TableRow key={attempt.id} className="border-crypto-gray hover:bg-crypto-gray/30">
                    <TableCell className="font-mono text-sm text-white">
                      {formatAddress(attempt.wallet_address)}
                    </TableCell>
                    <TableCell className="text-sm text-white">
                      {attempt.email ? (
                        <span className="text-crypto-green">{attempt.email}</span>
                      ) : (
                        <Badge variant="secondary" className="text-xs">No email</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-300">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-3 w-3 text-crypto-green" />
                        {formatFingerprint(attempt.fingerprint)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-crypto-green" />
                        {attempt.ip_address || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-400 max-w-xs truncate">
                      {attempt.user_agent || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-crypto-green" />
                        {formatDate(attempt.created_at)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
