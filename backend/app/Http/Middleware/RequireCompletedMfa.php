<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireCompletedMfa
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(401);
        }

        if (!$user->isActive()) {
            abort(403);
        }

        if ($user->requiresMfa() && !$user->hasConfirmedTwoFactor()) {
            return response()->json([
                'message' => 'Complete MFA setup before accessing this resource.',
                'code' => 'mfa_setup_required',
            ], 403);
        }

        return $next($request);
    }
}