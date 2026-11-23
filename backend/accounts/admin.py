"""
Accounts in the Django admin site: http://127.0.0.1:8000/admin/ (log in with a
superuser, e.g. admin@test.com from seed_test_data).

Users log in with their email, so the forms and lists below use email instead
of Django's default username.

A user with the role DOCTOR also needs a Doctor profile (licence number), and
a PATIENT a Patient profile, or the app refuses them. Add the profile at the
bottom of the user's page after saving the user.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import Administrator, Doctor, Patient, User


class UserCreateForm(UserCreationForm):
    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "role")


class UserEditForm(UserChangeForm):
    class Meta:
        model = User
        fields = "__all__"


class DoctorInline(admin.StackedInline):
    model = Doctor
    can_delete = False
    max_num = 1
    verbose_name_plural = "Doctor profile (needed when the role is Doctor)"


class PatientInline(admin.StackedInline):
    model = Patient
    can_delete = False
    max_num = 1
    verbose_name_plural = "Patient profile (needed when the role is Patient)"


class AdministratorInline(admin.StackedInline):
    model = Administrator
    can_delete = False
    max_num = 1
    verbose_name_plural = "Administrator profile"


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    form = UserEditForm
    add_form = UserCreateForm
    inlines = [DoctorInline, PatientInline, AdministratorInline]

    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "role", "account_status", "is_staff")
    list_filter = ("role", "account_status", "is_staff", "is_superuser")
    search_fields = ("email", "first_name", "last_name")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Name", {"fields": ("first_name", "last_name")}),
        ("Role and status", {
            "fields": ("role", "account_status"),
            "description": "Set the status to Suspended or Inactive to stop someone using the app.",
        }),
        ("Admin site access", {"fields": ("is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Activity", {"fields": ("last_login",)}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "first_name", "last_name", "role", "password1", "password2"),
        }),
    )
    filter_horizontal = ("groups", "user_permissions")

    def get_inline_instances(self, request, obj=None):
        # Profiles are added once the user exists (on the page after "Save").
        return super().get_inline_instances(request, obj) if obj else []


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ("user", "license_no", "status")
    search_fields = ("user__email", "user__first_name", "user__last_name", "license_no")
    autocomplete_fields = ("user",)


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("user", "date_of_birth", "gender")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    autocomplete_fields = ("user",)


@admin.register(Administrator)
class AdministratorAdmin(admin.ModelAdmin):
    list_display = ("user",)
    search_fields = ("user__email",)
    autocomplete_fields = ("user",)
