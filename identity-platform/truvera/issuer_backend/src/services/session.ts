import { v4 as uuidv4 } from 'uuid';
import { SessionState, ProcessStep, CredentialFormData } from '../types';
import { logger } from '../middleware';

// In-memory session store (in production, use Redis or database)
const sessionStore = new Map<string, SessionState>();

// Session cleanup interval (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

export class SessionService {
  constructor() {
    // Start cleanup interval
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, CLEANUP_INTERVAL);
  }

  /**
   * Create a new session
   */
  createSession(): SessionState {
    const sessionId = uuidv4();
    const now = new Date();
    
    const session: SessionState = {
      sessionId,
      currentStep: ProcessStep.WALLET_CONNECTION,
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TIMEOUT),
    };

    sessionStore.set(sessionId, session);
    
    logger.info('Session created', { sessionId });
    
    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionState | null {
    const session = sessionStore.get(sessionId);
    
    if (!session) {
      logger.warn('Session not found', { sessionId });
      return null;
    }

    if (session.expiresAt < new Date()) {
      logger.warn('Session expired', { sessionId });
      this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update session state
   */
  updateSession(sessionId: string, updates: Partial<SessionState>): SessionState | null {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    const updatedSession = {
      ...session,
      ...updates,
      sessionId, // Ensure sessionId cannot be changed
      createdAt: session.createdAt, // Ensure createdAt cannot be changed
    };

    sessionStore.set(sessionId, updatedSession);
    
    logger.info('Session updated', { 
      sessionId, 
      currentStep: updatedSession.currentStep,
      updates: Object.keys(updates)
    });
    
    return updatedSession;
  }

  /**
   * Update session step
   */
  updateSessionStep(sessionId: string, step: ProcessStep): SessionState | null {
    return this.updateSession(sessionId, { currentStep: step });
  }

  /**
   * Set wallet address in session
   */
  setWalletAddress(sessionId: string, walletAddress: string): SessionState | null {
    return this.updateSession(sessionId, { 
      walletAddress,
      currentStep: ProcessStep.QR_GENERATION 
    });
  }

  /**
   * Set connection details in session
   */
  setConnectionDetails(
    sessionId: string, 
    connectionId: string, 
    holderDID?: string
  ): SessionState | null {
    const updates: Partial<SessionState> = {
      connectionId,
      currentStep: holderDID ? ProcessStep.FORM_SUBMISSION : ProcessStep.WALLET_PAIRING
    };

    if (holderDID) {
      updates.holderDID = holderDID;
    }

    return this.updateSession(sessionId, updates);
  }

  /**
   * Set form data in session
   */
  setFormData(sessionId: string, formData: CredentialFormData): SessionState | null {
    return this.updateSession(sessionId, { 
      formData,
      currentStep: ProcessStep.QR_GENERATION 
    });
  }

  /**
   * Set current step in session
   */
  setCurrentStep(sessionId: string, step: ProcessStep): SessionState | null {
    return this.updateSession(sessionId, { currentStep: step });
  }

  /**
   * Set issuer ID in session
   */
  setIssuerId(sessionId: string, issuerId: string): SessionState | null {
    return this.updateSession(sessionId, { 
      issuerId,
      currentStep: ProcessStep.CREDENTIAL_ISSUANCE 
    });
  }

  /**
   * Set credential ID and complete the process
   */
  setCredentialId(sessionId: string, credentialId: string): SessionState | null {
    return this.updateSession(sessionId, { 
      credentialId,
      currentStep: ProcessStep.COMPLETION 
    });
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    const deleted = sessionStore.delete(sessionId);
    
    if (deleted) {
      logger.info('Session deleted', { sessionId });
    }
    
    return deleted;
  }

  /**
   * Get all active sessions (for debugging/monitoring)
   */
  getActiveSessions(): SessionState[] {
    const now = new Date();
    return Array.from(sessionStore.values()).filter(
      session => session.expiresAt > now
    );
  }

  /**
   * Get all active sessions (alias for compatibility)
   */
  getAllActiveSessions(): SessionState[] {
    return this.getActiveSessions();
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    total: number;
    active: number;
    byStep: Record<ProcessStep, number>;
  } {
    const sessions = this.getActiveSessions();
    const byStep = sessions.reduce((acc, session) => {
      acc[session.currentStep] = (acc[session.currentStep] || 0) + 1;
      return acc;
    }, {} as Record<ProcessStep, number>);

    return {
      total: sessionStore.size,
      active: sessions.length,
      byStep,
    };
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of sessionStore.entries()) {
      if (session.expiresAt < now) {
        sessionStore.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up expired sessions', { count: cleanedCount });
    }
  }



  /**
   * Check if session has required data for step
   */
  hasRequiredDataForStep(session: SessionState, step: ProcessStep): boolean {
    switch (step) {
      case ProcessStep.WALLET_CONNECTION:
        return true; // No data required
      
      case ProcessStep.QR_GENERATION:
        return !!session.walletAddress;
      
      case ProcessStep.WALLET_PAIRING:
        return !!session.walletAddress && !!session.connectionId;
      
      case ProcessStep.FORM_SUBMISSION:
        return !!session.walletAddress && !!session.connectionId && !!session.holderDID;
      
      case ProcessStep.CREDENTIAL_ISSUANCE:
        return !!session.walletAddress && 
               !!session.connectionId && 
               !!session.holderDID && 
               !!session.issuerId;
      
      case ProcessStep.COMPLETION:
        return !!session.walletAddress && 
               !!session.connectionId && 
               !!session.holderDID && 
               !!session.issuerId && 
               !!session.credentialId;
      
      default:
        return false;
    }
  }
}

// Export singleton instance
export const sessionService = new SessionService();
export default sessionService;