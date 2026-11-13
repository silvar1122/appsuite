<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AssetAssignmentController;


\Illuminate\Support\Facades\Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::get('/user', function (Request $request) {
    $user = $request->user();
    $requiresMfa = $user->requiresMfa();
    $mfaConfirmed = $user->hasConfirmedTwoFactor();

    return response()->json([
        'id' => $user->id,
        'first_name' => $user->first_name,
        'last_name' => $user->last_name,
        'email' => $user->email,
        'requires_mfa' => $requiresMfa,
        'mfa_confirmed' => $mfaConfirmed,
        'mfa_setup_required' => $requiresMfa && !$mfaConfirmed,
    ]);
})->middleware(['auth:sanctum', 'account.active']);

Route::middleware([
    'auth:sanctum',
    'account.active',
    'mfa.complete',
])->group(function () {
    Route::post(
        '/assets/{asset}/assignments',
        [AssetAssignmentController::class, 'store'],
    )->middleware('permission:assignments.assign');

    Route::patch(
        '/assignments/{assignment}/return',
        [AssetAssignmentController::class, 'close'],
    )->middleware('permission:assignments.return');
});