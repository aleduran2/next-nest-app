import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Uso: @UseGuards(JwtAuthGuard) arriba de cualquier controller/endpoint
// que requiera estar autenticado.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
