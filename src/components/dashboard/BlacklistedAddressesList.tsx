import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAccount } from 'wagmi'

interface BlacklistedAddress {
  id: string
  wallet_address: string
  reason: string
  blacklisted_at: string
  blacklisted_by: string
  is_active: boolean
}

export function BlacklistedAddressesList() {
  const [blacklistedAddresses, setBlacklistedAddresses] = useState<BlacklistedAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const { toast } = useToast()

  const { address } = useAccount()

  useEffect(() => {
    if (address) {
      fetchBlacklistedAddresses(address)
    }
  }, [address])

  const fetchBlacklistedAddresses = async (walletAddress: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('list-blacklisted', {
        body: { walletAddress }
      })

      if (error) throw error
      setBlacklistedAddresses(data?.addresses || [])
    } catch (error) {
      console.error('Error fetching blacklisted addresses:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch blacklisted addresses',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(address)
      toast({
        title: "Copied",
        description: "Address copied to clipboard",
      })
      setTimeout(() => setCopiedAddress(null), 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy address",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Blacklisted Addresses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading blacklisted addresses...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Blacklisted Addresses</span>
          <Badge variant="secondary">{blacklistedAddresses.length} Total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {blacklistedAddresses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No blacklisted addresses found
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Blacklisted At</TableHead>
                  <TableHead>Blacklisted By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blacklistedAddresses.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-sm">
                      {truncateAddress(entry.wallet_address)}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate text-sm">{entry.reason}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(entry.blacklisted_at)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {truncateAddress(entry.blacklisted_by)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(entry.wallet_address)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedAddress === entry.wallet_address ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
