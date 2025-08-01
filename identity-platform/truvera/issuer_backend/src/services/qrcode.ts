import QRCode from 'qrcode';
import { logger } from '../middleware';

export interface QRCodeOptions {
    width?: number;
    margin?: number;
    color?: {
        dark?: string;
        light?: string;
    };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface QRCodeGenerationResult {
    success: boolean;
    qrCodeDataURL?: string;
    qrCodeSVG?: string;
    qrCodeTerminal?: string;
    error?: string;
}

export class QRCodeService {
    private defaultOptions: QRCodeOptions = {
        width: 300,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
    };

    /**
     * Generate QR code as data URL (base64 image)
     */
    async generateDataURL(text: string, options?: QRCodeOptions): Promise<QRCodeGenerationResult> {
        try {
            logger.debug('Generating QR code as data URL', {
                textLength: text.length,
                options: { ...this.defaultOptions, ...options }
            });

            const qrOptions = { ...this.defaultOptions, ...options };
            const qrCodeDataURL = await QRCode.toDataURL(text, qrOptions);

            logger.info('QR code generated successfully as data URL', {
                textLength: text.length,
                dataURLLength: qrCodeDataURL.length
            });

            return {
                success: true,
                qrCodeDataURL
            };
        } catch (error) {
            logger.error('Failed to generate QR code as data URL', {
                error: error instanceof Error ? error.message : 'Unknown error',
                textLength: text.length
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error generating QR code'
            };
        }
    }

    /**
     * Generate QR code as SVG string
     */
    async generateSVG(text: string, options?: QRCodeOptions): Promise<QRCodeGenerationResult> {
        try {
            logger.debug('Generating QR code as SVG', {
                textLength: text.length,
                options: { ...this.defaultOptions, ...options }
            });

            const qrOptions = { ...this.defaultOptions, ...options };
            const qrCodeSVG = await QRCode.toString(text, {
                ...qrOptions,
                type: 'svg'
            });

            logger.info('QR code generated successfully as SVG', {
                textLength: text.length,
                svgLength: qrCodeSVG.length
            });

            return {
                success: true,
                qrCodeSVG
            };
        } catch (error) {
            logger.error('Failed to generate QR code as SVG', {
                error: error instanceof Error ? error.message : 'Unknown error',
                textLength: text.length
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error generating QR code'
            };
        }
    }

    /**
     * Generate QR code as terminal/console output
     */
    async generateTerminal(text: string, options?: { small?: boolean }): Promise<QRCodeGenerationResult> {
        try {
            logger.debug('Generating QR code for terminal display', {
                textLength: text.length,
                small: options?.small || false
            });

            const qrCodeTerminal = await QRCode.toString(text, {
                type: 'terminal',
                small: options?.small || false
            });

            logger.info('QR code generated successfully for terminal', {
                textLength: text.length,
                terminalLength: qrCodeTerminal.length
            });

            return {
                success: true,
                qrCodeTerminal
            };
        } catch (error) {
            logger.error('Failed to generate QR code for terminal', {
                error: error instanceof Error ? error.message : 'Unknown error',
                textLength: text.length
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error generating QR code'
            };
        }
    }

    /**
     * Generate QR code in multiple formats
     */
    async generateMultiFormat(text: string, options?: QRCodeOptions): Promise<{
        success: boolean;
        dataURL?: string;
        svg?: string;
        terminal?: string;
        error?: string;
    }> {
        try {
            logger.info('Generating QR code in multiple formats', {
                textLength: text.length
            });

            const [dataURLResult, svgResult, terminalResult] = await Promise.all([
                this.generateDataURL(text, options),
                this.generateSVG(text, options),
                this.generateTerminal(text, { small: true })
            ]);

            if (!dataURLResult.success || !svgResult.success || !terminalResult.success) {
                const errors = [
                    dataURLResult.error,
                    svgResult.error,
                    terminalResult.error
                ].filter(Boolean);

                throw new Error(`Failed to generate QR codes: ${errors.join(', ')}`);
            }

            logger.info('QR code generated successfully in all formats', {
                textLength: text.length
            });

            return {
                success: true,
                dataURL: dataURLResult.qrCodeDataURL,
                svg: svgResult.qrCodeSVG,
                terminal: terminalResult.qrCodeTerminal
            };
        } catch (error) {
            logger.error('Failed to generate QR code in multiple formats', {
                error: error instanceof Error ? error.message : 'Unknown error',
                textLength: text.length
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error generating QR codes'
            };
        }
    }

    /**
     * Validate if text can be encoded as QR code
     */
    validateText(text: string): { valid: boolean; error?: string } {
        if (!text || text.trim().length === 0) {
            return {
                valid: false,
                error: 'Text cannot be empty'
            };
        }

        // QR codes have a maximum capacity depending on the error correction level
        // For alphanumeric data with error correction level M, max is ~1,852 characters
        if (text.length > 1800) {
            return {
                valid: false,
                error: 'Text is too long for QR code generation (max ~1800 characters)'
            };
        }

        return { valid: true };
    }

    /**
     * Generate QR code with validation
     */
    async generateWithValidation(text: string, options?: QRCodeOptions): Promise<QRCodeGenerationResult> {
        const validation = this.validateText(text);
        
        if (!validation.valid) {
            logger.warn('QR code generation failed validation', {
                error: validation.error,
                textLength: text.length
            });

            return {
                success: false,
                error: validation.error
            };
        }

        return this.generateDataURL(text, options);
    }
}

// Export singleton instance
export const qrCodeService = new QRCodeService();
export default qrCodeService;