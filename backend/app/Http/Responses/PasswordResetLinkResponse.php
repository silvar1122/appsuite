<?php

namespace App\Http\Responses;

use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse;
use Laravel\Fortify\Contracts\SuccessfulPasswordResetLinkRequestResponse;

class PasswordResetLinkResponse implements
    SuccessfulPasswordResetLinkRequestResponse,
    FailedPasswordResetLinkRequestResponse
{
    public function __construct(string $status)
    {
        // Fortify supplies this, but the response is intentionally the same for every status.
    }

    public function toResponse($request)
    {
        $message = 'If the email address is registered, a password reset link will be sent.';

        return $request->wantsJson()
            ? response()->json(['message' => $message], 200)
            : back()->with('status', $message);
    }
}