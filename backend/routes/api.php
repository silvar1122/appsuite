<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AssetAssignmentController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\EmployeeController;



\Illuminate\Support\Facades\Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::get('/user', function (Request $request) {
    $user = $request->user();
   
    return response()->json([
        'id' => $user->id,
        'first_name' => $user->first_name,
        'last_name' => $user->last_name,
        'email' => $user->email,
        'roles' => $user->roles()->orderBy('slug')->pluck('slug'),
        'requires_mfa' => $user->requiresMfa(),
        'mfa_confirmed' => $user->hasConfirmedTwoFactor(),
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


    //asset assigment history
    Route::get(
        '/assets/{asset}/assignments',
        [AssetAssignmentController::class, 'forAsset'],
    )->middleware('permission:assignments.view_all');

    Route::get(
        '/me/asset-history',
        [AssetAssignmentController::class, 'mine'],
    )->middleware('permission:assignments.view_own_history');


    //assets
    Route::get('/assets', [AssetController::class, 'index']);

    Route::get('/assets/{asset}', [AssetController::class, 'show']);

    Route::post('/assets', [AssetController::class, 'store'])
        ->middleware('permission:assets.create');

    Route::patch('/assets/{asset}', [AssetController::class, 'update'])
        ->middleware('permission:assets.update');

    Route::post('/assets/{asset}/retire', [AssetController::class, 'retire'])
        ->middleware('permission:assets.retire');

    // Ticket
    Route::post('/assets/{asset}/tickets', [TicketController::class, 'store'])
        ->middleware('permission:tickets.create');

    Route::patch('/tickets/{ticket}/close', [TicketController::class, 'close'])
        ->middleware('permission:tickets.close');

    Route::get('/tickets', [TicketController::class, 'index']);

    //employee
    Route::post('/employees', [EmployeeController::class, 'store'])
        ->middleware('permission:employees.create');

    Route::get('/employees', [EmployeeController::class, 'index'])
        ->middleware('permission:employees.view_all');

    Route::patch('/employees/{employee}', [EmployeeController::class, 'update'])
        ->middleware('permission:employees.update');

    Route::post(
        '/employees/{employee}/deactivate',
        [EmployeeController::class, 'deactivate'],
    )->middleware('permission:employees.deactivate');


});