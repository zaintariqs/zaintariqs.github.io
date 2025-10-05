import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle, XCircle, Search, Trash2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface WhitelistRequest {
  id: string
  wallet_address: string
  email: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string
  requested_at: string
  reviewed_at?: string
  reviewed_by?: string
}

export function WhitelistingRequests() {
  const { address } = useAccount()
  const { toast } = useToast()
  const [requests, setRequests] = useState<WhitelistRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<WhitelistRequest | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [searchEmail, setSearchEmail] = useState('')

  const fetchRequests = async () => {
    if (!address) return

    try {
      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/whitelist-requests',
        {
          method: 'GET',
          headers: {
            'x-wallet-address': address,
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch whitelist requests')
      }

      const data = await response.json()
      setRequests(data.requests || [])
    } catch (error: any) {
      console.error('Error fetching whitelist requests:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [address])

  const handleApprove = async (request: WhitelistRequest) => {
    if (!address) return

    setProcessingId(request.id)
    try {
      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/approve-whitelist',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': address,
          },
          body: JSON.stringify({
            requestId: request.id,
            action: 'approve',
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve request')
      }

      toast({
        title: "Success",
        description: "Whitelist request approved and user notified via email",
      })

      await fetchRequests()
    } catch (error: any) {
      console.error('Error approving request:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async () => {
    if (!address || !selectedRequest) return

    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive"
      })
      return
    }

    setProcessingId(selectedRequest.id)
    try {
      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/approve-whitelist',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': address,
          },
          body: JSON.stringify({
            requestId: selectedRequest.id,
            action: 'reject',
            rejectionReason: rejectionReason,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reject request')
      }

      toast({
        title: "Success",
        description: "Whitelist request rejected and user notified via email",
      })

      setShowRejectDialog(false)
      setSelectedRequest(null)
      setRejectionReason('')
      await fetchRequests()
    } catch (error: any) {
      console.error('Error rejecting request:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (request: WhitelistRequest) => {
    if (!address) return

    const confirmed = window.confirm(
      `Are you sure you want to delete the whitelist request for ${request.email}?`
    )
    if (!confirmed) return

    setProcessingId(request.id)
    try {
      const { error } = await supabase
        .from('whitelist_requests')
        .delete()
        .eq('id', request.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Whitelist request deleted successfully",
      })

      await fetchRequests()
    } catch (error: any) {
      console.error('Error deleting request:', error)
      toast({
        title: "Error",
        description: error.message || 'Failed to delete whitelist request',
        variant: "destructive"
      })
    } finally {
      setProcessingId(null)
    }
  }

  const openRejectDialog = (request: WhitelistRequest) => {
    setSelectedRequest(request)
    setShowRejectDialog(true)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'secondary' as const },
      approved: { label: 'Approved', variant: 'default' as const },
      rejected: { label: 'Rejected', variant: 'destructive' as const },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  // Filter requests based on email search
  const filteredRequests = requests.filter((request) => {
    if (!searchEmail.trim()) return true
    // Sanitize search input and perform case-insensitive search
    const sanitizedSearch = searchEmail.trim().toLowerCase()
    return request.email.toLowerCase().includes(sanitizedSearch)
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Whitelisting Requests</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Search by email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value.slice(0, 255))}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {searchEmail ? 'No whitelist requests found matching your search' : 'No whitelist requests found'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Wallet Address</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Reviewed By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-xs">
                        {request.wallet_address.slice(0, 6)}...{request.wallet_address.slice(-4)}
                      </TableCell>
                      <TableCell>{request.email}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{formatDate(request.requested_at)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {request.reviewed_by ? (
                          `${request.reviewed_by.slice(0, 6)}...${request.reviewed_by.slice(-4)}`
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 items-center">
                          {request.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(request)}
                                disabled={processingId === request.id}
                              >
                                {processingId === request.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openRejectDialog(request)}
                                disabled={processingId === request.id}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {request.status === 'rejected' && request.rejection_reason && (
                            <span className="text-xs text-muted-foreground mr-2">
                              {request.rejection_reason}
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(request)}
                            disabled={processingId === request.id}
                            className="ml-auto"
                          >
                            {processingId === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Whitelist Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this whitelist request. The user will be notified via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}