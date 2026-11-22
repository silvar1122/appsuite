<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

#[Signature('app:bootstrap-asset-manager')]
#[Description('Create the first active Asset Manager account and send a password setup link.')]
class BootstrapAssetManager extends Command
{
    public function handle(): int
    {
        if (
            app()->environment('production')
            && !$this->confirm('Create an initial Asset Manager account in production?')
        ) {
            return self::FAILURE;
        }

        $firstName = trim((string) $this->ask('First name'));
        $lastName = trim((string) $this->ask('Last name'));
        $email = Str::lower(trim((string) $this->ask('Email address')));

        if (
            $firstName === ''
            || mb_strlen($firstName) > 100
            || $lastName === ''
            || mb_strlen($lastName) > 100
            || !filter_var($email, FILTER_VALIDATE_EMAIL)
            || mb_strlen($email) > 255
        ) {
            $this->error('Enter valid names (up to 100 characters) and a valid email address.');

            return self::FAILURE;
        }

        if (User::query()->where('email', $email)->exists()) {
            $this->error('That email address is already in use.');

            return self::FAILURE;
        }

        try {
            $manager = DB::transaction(function () use ($firstName, $lastName, $email): User {
                $role = Role::query()
                    ->where('slug', 'asset_manager')
                    ->lockForUpdate()
                    ->first();

                if (!$role || !$role->is_system || !$role->mfa_required) {
                    throw new RuntimeException(
                        'The built-in MFA-required Asset Manager role is missing or misconfigured. Run the database seeder first.'
                    );
                }

                $activeManagerExists = User::query()
                    ->where('account_status', 'active')
                    ->whereHas(
                        'roles',
                        fn ($query) => $query->whereKey($role->id),
                    )
                    ->exists();

                if ($activeManagerExists) {
                    throw new RuntimeException('An active Asset Manager already exists.');
                }

                $manager = new User();
                $manager->first_name = $firstName;
                $manager->last_name = $lastName;
                $manager->email = $email;
                $manager->password = Str::random(64);
                $manager->account_status = 'active';
                $manager->save();

                $manager->roles()->attach($role->id);

                $log = new AuditLog();
                $log->actor_user_id = null;
                $log->event_type = 'employee.bootstrap_manager';
                $log->subject_type = 'user';
                $log->subject_id = $manager->id;
                $log->metadata = [
                    'role_slug' => 'asset_manager',
                    'provisioned_by' => 'artisan',
                ];
                $log->created_at = now();
                $log->save();

                return $manager;
            });
        } catch (RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        try {
            $status = Password::sendResetLink(['email' => $manager->email]);
        } catch (Throwable $exception) {
            report($exception);
            $this->error(
                'The manager account was created, but the setup email could not be sent. Use the password reset flow to send a new link.'
            );

            return self::FAILURE;
        }

        if ($status !== Password::RESET_LINK_SENT) {
            $this->error(
                'The manager account was created, but the setup email was not sent. Use the password reset flow to send a new link.'
            );

            return self::FAILURE;
        }

        $this->info('Asset Manager account created. Open Mailpit to view the password setup email.');

        return self::SUCCESS;
    }
}