<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

use Illuminate\Validation\Rules\Password;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Password::defaults(
            fn() => Password::min(15)
                ->max(128)
                ->uncompromised()
        );

        ResetPassword::createUrlUsing(
            function (User $user, string $token): string {
                return rtrim(config('app.frontend_url'), '/')
                    . '/set-password?'
                    . http_build_query([
                        'token' => $token,
                        'email' => $user->email,
                    ]);
            }
        );
    }
}
