<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

\Illuminate\Support\Facades\Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});