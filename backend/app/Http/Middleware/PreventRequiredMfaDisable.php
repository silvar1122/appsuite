<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PreventRequiredMfaDisable
{
    public function handle(Request $request, Closure $next): Response
    {
        if (
            $request->routeIs('two-factor.disable')
            && $request->user()?->requiresMfa()
        ) {
            abort(403);
        }

        return $next($request);
    }
}